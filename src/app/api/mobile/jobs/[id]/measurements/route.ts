import { NextResponse } from "next/server";
import { requireMobileJobsUser } from "@/lib/mobile/auth";
import {
  addMeasurement,
  advanceJobStatus,
  getJobBundle,
  replaceLineItems,
  upsertDesignSpec,
} from "@/lib/jobs/store";
import type { MeasurementAnnotation, MeasureUnit } from "@/lib/jobs/types";
import {
  buildDesignDescription,
  buildDesignNotesFromMeasurements,
  prefillLineItemsFromMeasurements,
} from "@/lib/jobs/mobile-prefill";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IncomingMeasurement = {
  label: string;
  width?: number | null;
  height?: number | null;
  unit?: MeasureUnit;
  lengthInches?: number;
  annotation?: MeasurementAnnotation | null;
  start3d?: { x: number; y: number; z: number };
  end3d?: { x: number; y: number; z: number };
  source?: "photo" | "lidar" | "roomplan";
  scanId?: string;
};

/**
 * POST /api/mobile/jobs/[id]/measurements
 * Body JSON: { measurements: IncomingMeasurement[], prefill?: boolean }
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileJobsUser(request);
  if (!auth.ok) return auth.response;

  const { id: jobId } = await ctx.params;
  const bundle = await getJobBundle(jobId, auth.user.id);
  if (!bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { measurements?: IncomingMeasurement[]; prefill?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = body.measurements ?? [];
  if (!items.length) {
    return NextResponse.json(
      { error: "measurements array required" },
      { status: 400 },
    );
  }

  const created = [];
  for (const item of items) {
    if (!item.label?.trim()) {
      return NextResponse.json(
        { error: "Each measurement needs a label" },
        { status: 400 },
      );
    }

    const unit: MeasureUnit = item.unit === "ft" ? "ft" : "in";
    let width = item.width ?? null;
    let height = item.height ?? null;
    let realLength =
      item.annotation?.realLength ??
      item.lengthInches ??
      null;

    // Single-length line → store as width in inches
    if (realLength != null && width == null && height == null) {
      width = unit === "ft" ? realLength / 12 : realLength;
      if (unit === "ft" && item.lengthInches != null) {
        // lengthInches always inches; convert display unit
        width = item.lengthInches;
        // keep unit as in for stored width when using lengthInches
      }
    }

    let annotation: MeasurementAnnotation | null = item.annotation ?? null;
    if (!annotation && (realLength != null || item.start3d || item.end3d)) {
      annotation = {
        scanId: item.scanId || "",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        realLength:
          item.lengthInches ??
          realLength ??
          (width != null && height == null ? width : 0),
        start3d: item.start3d,
        end3d: item.end3d,
        source: item.source ?? "lidar",
      };
    }

    // Normalize realLength to inches in annotation
    if (annotation && item.lengthInches != null) {
      annotation.realLength = item.lengthInches;
    }

    const row = await addMeasurement(jobId, auth.user.id, {
      label: item.label.trim(),
      width,
      height,
      unit: height != null && width != null ? unit : "in",
      annotation,
    });
    if (row) created.push(row);
  }

  const prefill = body.prefill !== false;
  let designSpec = bundle.designSpec;
  let lineItems = bundle.lineItems;

  if (prefill && created.length) {
    const allMeasurements = [...bundle.measurements, ...created];
    const notes = buildDesignNotesFromMeasurements(
      designSpec?.notes || "",
      allMeasurements,
    );
    const description = buildDesignDescription(
      designSpec?.description || "",
      allMeasurements,
    );
    designSpec = await upsertDesignSpec(jobId, auth.user.id, {
      signType: designSpec?.signType || "Channel letters",
      description,
      notes,
      referenceImages: designSpec?.referenceImages,
    });

    const nextItems = prefillLineItemsFromMeasurements(
      lineItems.map((l) => ({
        id: l.id,
        category: l.category,
        description: l.description,
        qty: l.qty,
        unitCost: l.unitCost,
        markupPct: l.markupPct,
        catalogKey: l.catalogKey,
      })),
      allMeasurements,
    );
    const replaced = await replaceLineItems(jobId, auth.user.id, nextItems);
    if (replaced) lineItems = replaced;
  }

  if (
    bundle.job.status === "start" ||
    bundle.job.status === "site_capture"
  ) {
    await advanceJobStatus(jobId, auth.user.id, "site_capture");
  }

  const fresh = await getJobBundle(jobId, auth.user.id);

  return NextResponse.json({
    ok: true,
    measurements: created,
    designSpec: fresh?.designSpec ?? designSpec,
    lineItems: fresh?.lineItems ?? lineItems,
    job: fresh?.job,
  });
}

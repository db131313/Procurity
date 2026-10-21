"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  addMeasurementAction,
  deleteMeasurementAction,
  generateQuotePdfAction,
  saveDesignAction,
  saveJobStartAction,
  saveLineItemsAction,
  sendQuoteAction,
  setJobStageAction,
  setupInvoicesAction,
} from "@/app/actions/jobs";
import { JobStepper } from "@/components/jobs/JobStepper";
import { ModelViewer } from "@/components/jobs/ModelViewer";
import { AnnotatedMeasure } from "@/components/jobs/AnnotatedMeasure";
import { MATERIALS_CATALOG, SIGN_TYPES } from "@/lib/jobs/catalog";
import {
  computeTotals,
  lineItemExtended,
  type JobBundle,
  type JobStatus,
  type LineItemCategory,
  type LineItemRecord,
  type MeasureUnit,
} from "@/lib/jobs/types";
import { WorkingSpinner } from "@/components/ui/WorkingIndicator";

type Props = {
  bundle: JobBundle;
  projectLabel?: string | null;
};

export function JobWorkflow({ bundle: initial, projectLabel }: Props) {
  const [bundle, setBundle] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = bundle.job;

  function refreshFromServer() {
    // Soft refresh via navigation reload of RSC props — keep local optimistic edits.
    window.location.reload();
  }

  function goStage(status: JobStatus) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await setJobStageAction(job.id, status);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setBundle((b) => ({ ...b, job: { ...b.job, status } }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not change stage");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate">
            Job
          </p>
          <h1 className="text-2xl font-bold text-ink">
            {job.customerName || job.siteAddress || "New job"}
          </h1>
          {projectLabel ? (
            <p className="mt-1 text-sm text-slate">Linked project: {projectLabel}</p>
          ) : null}
        </div>
        <Link
          href="/app/jobs"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
        >
          All jobs
        </Link>
      </div>

      <JobStepper status={job.status} onSelect={goStage} />

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {job.status === "start" ? (
        <StageStart
          bundle={bundle}
          pending={pending}
          onSave={(data, advance) => {
            setError(null);
            startTransition(async () => {
              try {
                const res = await saveJobStartAction(job.id, {
                  ...data,
                  advance,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage(advance ? "Moved to Site capture" : "Saved");
                refreshFromServer();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed");
              }
            });
          }}
        />
      ) : null}

      {job.status === "site_capture" ? (
        <StageCapture
          bundle={bundle}
          pending={pending}
          onReload={refreshFromServer}
          onAdvance={() => goStage("design")}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {job.status === "design" ? (
        <StageDesign
          bundle={bundle}
          pending={pending}
          onReload={refreshFromServer}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {job.status === "estimate" ? (
        <StageEstimate
          bundle={bundle}
          pending={pending}
          onReload={refreshFromServer}
          setError={setError}
          setMessage={setMessage}
          onAdvanceInvoice={() => goStage("invoice")}
        />
      ) : null}

      {job.status === "invoice" || job.status === "completed" ? (
        <StageInvoice
          bundle={bundle}
          pending={pending}
          onReload={refreshFromServer}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none ring-purple/30 focus:ring-2";
}

function StageStart({
  bundle,
  pending,
  onSave,
}: {
  bundle: JobBundle;
  pending: boolean;
  onSave: (
    data: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      siteAddress: string;
      projectId: string | null;
    },
    advance: boolean,
  ) => void;
}) {
  const [customerName, setCustomerName] = useState(bundle.job.customerName);
  const [customerEmail, setCustomerEmail] = useState(bundle.job.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(bundle.job.customerPhone);
  const [siteAddress, setSiteAddress] = useState(bundle.job.siteAddress);

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold text-ink">1 — Start job</h2>
      <p className="text-sm text-slate">
        Customer and site info. Optionally linked from a map project.
      </p>
      {bundle.job.projectId ? (
        <p className="rounded-xl bg-offwhite px-3 py-2 text-xs font-semibold text-slate">
          Linked project id: {bundle.job.projectId}
        </p>
      ) : null}
      <Field label="Customer name">
        <input
          className={inputClass()}
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </Field>
      <Field label="Customer email">
        <input
          className={inputClass()}
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
      </Field>
      <Field label="Customer phone">
        <input
          className={inputClass()}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </Field>
      <Field label="Site address">
        <input
          className={inputClass()}
          value={siteAddress}
          onChange={(e) => setSiteAddress(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSave(
              {
                customerName,
                customerEmail,
                customerPhone,
                siteAddress,
                projectId: bundle.job.projectId,
              },
              false,
            )
          }
          className="rounded-full border border-line px-5 py-3 text-sm font-bold"
        >
          Save
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            onSave(
              {
                customerName,
                customerEmail,
                customerPhone,
                siteAddress,
                projectId: bundle.job.projectId,
              },
              true,
            )
          }
          className="pc-gradient-bg rounded-full px-5 py-3 text-sm font-bold text-white"
        >
          {pending ? "Working…" : "Continue to site capture"}
        </button>
      </div>
    </section>
  );
}

function StageCapture({
  bundle,
  pending,
  onReload,
  onAdvance,
  setError,
  setMessage,
}: {
  bundle: JobBundle;
  pending: boolean;
  onReload: () => void;
  onAdvance: () => void;
  setError: (s: string | null) => void;
  setMessage: (s: string | null) => void;
}) {
  const [unit, setUnit] = useState<MeasureUnit>("in");
  const [label, setLabel] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [uploading, setUploading] = useState(false);
  const photos = bundle.scans.filter((s) => s.type === "photo");

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("jobId", bundle.job.id);
      fd.set("file", file);
      const res = await fetch("/api/jobs/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setMessage(`Uploaded ${file.name}`);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold text-ink">2 — Site capture</h2>
      <p className="text-sm text-slate">
        Upload scans or photos (USDZ / OBJ / GLB / PLY, images, PDFs).
      </p>

      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
        <p className="font-bold">TODO — Native LiDAR capture</p>
        <p className="mt-1 text-xs">
          A companion iOS app will stream room / facade LiDAR meshes into this
          job. Do not fake LiDAR data here.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 rounded-full border border-amber-400 px-4 py-2 text-xs font-bold opacity-70"
          title="Coming soon"
        >
          Scan with iPhone (coming soon)
        </button>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-offwhite px-4 py-8 text-sm font-semibold text-slate">
        {uploading ? <WorkingSpinner /> : "Tap to upload files"}
        <input
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.webp,.pdf,.glb,.gltf,.usdz,.obj,.ply,image/*,application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>

      <div className="space-y-3">
        {bundle.scans.map((scan) => (
          <div key={scan.id} className="rounded-xl border border-line p-3">
            <p className="text-sm font-bold text-ink">{scan.fileName}</p>
            <p className="text-xs text-slate">{scan.type}</p>
            {scan.type === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={scan.fileUrl}
                alt={scan.fileName}
                className="mt-2 max-h-56 w-full rounded-lg object-cover"
              />
            ) : scan.type === "scan_3d" ? (
              <div className="mt-2">
                <ModelViewer src={scan.fileUrl} fileName={scan.fileName} />
              </div>
            ) : (
              <a
                href={scan.fileUrl}
                className="mt-2 inline-block text-sm font-semibold text-purple underline"
                target="_blank"
                rel="noreferrer"
              >
                Open file
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-line p-3">
        <h3 className="text-sm font-bold">Measurements</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            className={inputClass()}
            placeholder="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className={inputClass()}
            placeholder="Width"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            inputMode="decimal"
          />
          <input
            className={inputClass()}
            placeholder="Height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            inputMode="decimal"
          />
          <select
            className={inputClass()}
            value={unit}
            onChange={(e) => setUnit(e.target.value as MeasureUnit)}
          >
            <option value="in">in</option>
            <option value="ft">ft</option>
          </select>
        </div>
        <button
          type="button"
          disabled={pending || !label}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => {
            setError(null);
            void addMeasurementAction(bundle.job.id, {
              label,
              width: width ? Number(width) : null,
              height: height ? Number(height) : null,
              unit,
            })
              .then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setLabel("");
                setWidth("");
                setHeight("");
                onReload();
              })
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Could not add measurement",
                ),
              );
          }}
        >
          Add row
        </button>
        <ul className="divide-y divide-line text-sm">
          {bundle.measurements.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span>
                {m.label}:{" "}
                {m.annotation
                  ? `${m.annotation.realLength} ${m.unit} (annotated)`
                  : `${m.width ?? "—"} × ${m.height ?? "—"} ${m.unit}`}
              </span>
              <button
                type="button"
                className="text-xs font-bold text-slate underline"
                onClick={() => {
                  setError(null);
                  void deleteMeasurementAction(bundle.job.id, m.id)
                    .then((res) => {
                      if (!res.ok) {
                        setError(res.error);
                        return;
                      }
                      onReload();
                    })
                    .catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Could not remove",
                      ),
                    );
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      {photos[0] ? (
        <AnnotatedMeasure
          scanId={photos[0].id}
          imageUrl={photos[0].fileUrl}
          unit={unit}
          onSave={async ({ label: l, annotation }) => {
            setError(null);
            const res = await addMeasurementAction(bundle.job.id, {
              label: l,
              unit,
              width: annotation.realLength,
              height: null,
              annotation,
            });
            if (!res.ok) {
              setError(res.error);
              return;
            }
            onReload();
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={onAdvance}
        className="pc-gradient-bg w-full rounded-full py-3 text-sm font-bold text-white"
      >
        Continue to design
      </button>
    </section>
  );
}

function StageDesign({
  bundle,
  pending,
  onReload,
  setError,
  setMessage,
}: {
  bundle: JobBundle;
  pending: boolean;
  onReload: () => void;
  setError: (s: string | null) => void;
  setMessage: (s: string | null) => void;
}) {
  const [signType, setSignType] = useState(
    bundle.designSpec?.signType || SIGN_TYPES[0],
  );
  const [description, setDescription] = useState(
    bundle.designSpec?.description || "",
  );
  const [notes, setNotes] = useState(bundle.designSpec?.notes || "");
  const [uploading, setUploading] = useState(false);

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold text-ink">3 — Design & materials</h2>
      <Field label="Sign type">
        <select
          className={inputClass()}
          value={signType}
          onChange={(e) => setSignType(e.target.value)}
        >
          {SIGN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          className={inputClass()}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Notes">
        <textarea
          className={inputClass()}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-line bg-offwhite px-4 py-6 text-sm font-semibold text-slate">
        {uploading ? "Uploading…" : "Upload reference art"}
        <input
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setUploading(true);
            const fd = new FormData();
            fd.set("jobId", bundle.job.id);
            fd.set("purpose", "reference");
            fd.set("file", f);
            void fetch("/api/jobs/upload", {
              method: "POST",
              body: fd,
              credentials: "same-origin",
            })
              .then(async (res) => {
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Upload failed");
                setMessage("Reference uploaded");
                onReload();
              })
              .catch((err) =>
                setError(err instanceof Error ? err.message : "Upload failed"),
              )
              .finally(() => setUploading(false));
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {(bundle.designSpec?.referenceImages || []).map((img) => (
          <a
            key={img.url}
            href={img.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-purple"
          >
            {img.fileName}
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-line p-3">
        <h3 className="text-sm font-bold">Materials catalog</h3>
        <p className="text-xs text-slate">
          Add items with default costs — edit quantities on the Estimate stage.
        </p>
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
          {MATERIALS_CATALOG.map((m) => (
            <li
              key={m.key}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-offwhite"
            >
              <span>
                {m.label}{" "}
                <span className="text-xs text-slate">
                  ${m.defaultUnitCost}/{m.unit}
                </span>
              </span>
              <button
                type="button"
                className="text-xs font-bold text-purple"
                onClick={() => {
                  const existing = bundle.lineItems;
                  const next = [
                    ...existing,
                    {
                      category: m.category,
                      description: m.label,
                      qty: 1,
                      unitCost: m.defaultUnitCost,
                      markupPct: 40,
                      catalogKey: m.key,
                    },
                  ];
                  void saveLineItemsAction(bundle.job.id, next)
                    .then((res) => {
                      if (!res.ok) {
                        setError(res.error);
                        return;
                      }
                      setMessage(`Added ${m.label}`);
                      onReload();
                    })
                    .catch((e) =>
                      setError(
                        e instanceof Error ? e.message : "Could not add item",
                      ),
                    );
                }}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={pending}
        className="pc-gradient-bg w-full rounded-full py-3 text-sm font-bold text-white"
        onClick={() => {
          setError(null);
          void saveDesignAction(bundle.job.id, {
            signType,
            description,
            notes,
            advance: true,
          })
            .then((res) => {
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setMessage("Design saved");
              onReload();
            })
            .catch((e) =>
              setError(e instanceof Error ? e.message : "Save failed"),
            );
        }}
      >
        Continue to estimate
      </button>
    </section>
  );
}

function StageEstimate({
  bundle,
  pending,
  onReload,
  setError,
  setMessage,
  onAdvanceInvoice,
}: {
  bundle: JobBundle;
  pending: boolean;
  onReload: () => void;
  setError: (s: string | null) => void;
  setMessage: (s: string | null) => void;
  onAdvanceInvoice: () => void;
}) {
  const [items, setItems] = useState<LineItemRecord[]>(bundle.lineItems);
  const [taxRatePct, setTaxRatePct] = useState(bundle.job.taxRatePct);
  const totals = useMemo(
    () => computeTotals(items, taxRatePct),
    [items, taxRatePct],
  );
  const latestQuote = bundle.quotes[0];

  function updateItem(id: string, patch: Partial<LineItemRecord>) {
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold text-ink">4 — Estimate & quote</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-slate">
            <tr>
              <th className="py-2">Description</th>
              <th>Cat</th>
              <th>Qty</th>
              <th>Unit $</th>
              <th>Markup %</th>
              <th>Ext</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line">
                <td className="py-2">
                  <input
                    className="w-full rounded-lg border border-line px-2 py-1"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                  />
                </td>
                <td>
                  <select
                    className="rounded-lg border border-line px-1 py-1"
                    value={item.category}
                    onChange={(e) =>
                      updateItem(item.id, {
                        category: e.target.value as LineItemCategory,
                      })
                    }
                  >
                    {(["material", "labor", "install", "permit"] as const).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </td>
                <td>
                  <input
                    className="w-16 rounded-lg border border-line px-1 py-1"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(item.id, { qty: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <input
                    className="w-20 rounded-lg border border-line px-1 py-1"
                    value={item.unitCost}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitCost: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className="w-16 rounded-lg border border-line px-1 py-1"
                    value={item.markupPct}
                    onChange={(e) =>
                      updateItem(item.id, {
                        markupPct: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="font-semibold">
                  ${lineItemExtended(item).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tax %">
          <input
            className={inputClass()}
            value={taxRatePct}
            onChange={(e) => setTaxRatePct(Number(e.target.value) || 0)}
          />
        </Field>
        <div className="text-sm">
          <p>Subtotal ${totals.subtotal.toFixed(2)}</p>
          <p>Tax ${totals.tax.toFixed(2)}</p>
          <p className="text-base font-bold">Total ${totals.total.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className="rounded-full border border-line px-4 py-2 text-sm font-bold"
          onClick={() => {
            setError(null);
            void saveLineItemsAction(
              bundle.job.id,
              items.map((i) => ({
                id: i.id,
                category: i.category,
                description: i.description,
                qty: i.qty,
                unitCost: i.unitCost,
                markupPct: i.markupPct,
                catalogKey: i.catalogKey,
              })),
              taxRatePct,
            )
              .then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage("Line items saved");
                onReload();
              })
              .catch((e) =>
                setError(e instanceof Error ? e.message : "Save failed"),
              );
          }}
        >
          Save line items
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
          onClick={() => {
            void (async () => {
              setError(null);
              try {
                const saved = await saveLineItemsAction(
                  bundle.job.id,
                  items.map((i) => ({
                    id: i.id,
                    category: i.category,
                    description: i.description,
                    qty: i.qty,
                    unitCost: i.unitCost,
                    markupPct: i.markupPct,
                    catalogKey: i.catalogKey,
                  })),
                  taxRatePct,
                );
                if (!saved.ok) {
                  setError(saved.error);
                  return;
                }
                const res = await generateQuotePdfAction(bundle.job.id);
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage(`Quote v${res.quote.version} PDF ready`);
                onReload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "PDF failed");
              }
            })();
          }}
        >
          Generate quote PDF
        </button>
        {latestQuote?.pdfUrl ? (
          <a
            href={latestQuote.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-line px-4 py-2 text-sm font-bold text-purple"
          >
            Open PDF
          </a>
        ) : null}
        {latestQuote ? (
          <button
            type="button"
            className="pc-gradient-bg rounded-full px-4 py-2 text-sm font-bold text-white"
            onClick={() => {
              setError(null);
              void sendQuoteAction(bundle.job.id, latestQuote.id)
                .then((res) => {
                  if (!res.ok) {
                    setError(res.error);
                    return;
                  }
                  setMessage(
                    res.stub
                      ? `Quote email stubbed (set RESEND_API_KEY). Accept: ${res.acceptUrl}`
                      : "Quote emailed to customer",
                  );
                  onReload();
                })
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Send failed"),
                );
            }}
          >
            Send quote
          </button>
        ) : null}
        <button
          type="button"
          className="rounded-full border border-line px-4 py-2 text-sm font-bold"
          onClick={() => {
            setError(null);
            onAdvanceInvoice();
          }}
        >
          Go to invoicing
        </button>
      </div>
      {latestQuote ? (
        <p className="text-xs text-slate">
          Latest quote v{latestQuote.version} · {latestQuote.status} · accept
          link /quote/{latestQuote.acceptToken}
        </p>
      ) : null}
    </section>
  );
}

function StageInvoice({
  bundle,
  pending,
  onReload,
  setError,
  setMessage,
}: {
  bundle: JobBundle;
  pending: boolean;
  onReload: () => void;
  setError: (s: string | null) => void;
  setMessage: (s: string | null) => void;
}) {
  const accepted = bundle.quotes.find((q) => q.status === "accepted");

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-lg font-bold text-ink">5 — Invoice & payment</h2>
      {!accepted ? (
        <p className="text-sm text-slate">
          Waiting for the customer to accept a quote. Use Send quote, then the
          public accept link.
        </p>
      ) : (
        <p className="text-sm text-emerald-800">
          Quote accepted {accepted.acceptedAt ? new Date(accepted.acceptedAt).toLocaleString() : ""}.
          Total ${accepted.total.toFixed(2)}.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !accepted}
          className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => {
            setError(null);
            void setupInvoicesAction(bundle.job.id, "full")
              .then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage("Created 100% upfront invoice");
                onReload();
              })
              .catch((e) =>
                setError(e instanceof Error ? e.message : "Failed"),
              );
          }}
        >
          100% upfront
        </button>
        <button
          type="button"
          disabled={pending || !accepted}
          className="rounded-full border border-line px-4 py-2 text-sm font-bold disabled:opacity-50"
          onClick={() => {
            setError(null);
            void setupInvoicesAction(bundle.job.id, "deposit_balance")
              .then((res) => {
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                setMessage("Created 50% deposit + 50% balance");
                onReload();
              })
              .catch((e) =>
                setError(e instanceof Error ? e.message : "Failed"),
              );
          }}
        >
          50% deposit + 50% balance
        </button>
      </div>

      <ul className="space-y-3">
        {bundle.invoices.map((inv) => (
          <li
            key={inv.id}
            className="rounded-xl border border-line bg-offwhite/60 px-3 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-bold capitalize text-ink">
                  {inv.type} · ${inv.amount.toFixed(2)}
                </p>
                <p className="text-xs text-slate">Status: {inv.status}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {inv.pdfUrl ? (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold"
                  >
                    Invoice PDF
                  </a>
                ) : null}
                {inv.status === "open" ? (
                  <button
                    type="button"
                    className="pc-gradient-bg rounded-full px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => {
                      void fetch("/api/jobs/invoice-checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "same-origin",
                        body: JSON.stringify({
                          jobId: bundle.job.id,
                          invoiceId: inv.id,
                        }),
                      })
                        .then(async (res) => {
                          const json = await res.json();
                          if (!res.ok) {
                            throw new Error(json.error || "Checkout failed");
                          }
                          if (json.url) window.location.href = json.url;
                          else onReload();
                        })
                        .catch((e) =>
                          setError(
                            e instanceof Error ? e.message : "Checkout failed",
                          ),
                        );
                    }}
                  >
                    Pay with Stripe
                  </button>
                ) : null}
                {inv.status === "draft" ? (
                  <span className="text-xs font-semibold text-slate">
                    Unlocks after deposit clears
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {bundle.payments.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold">Payments</h3>
          <ul className="mt-1 text-xs text-slate">
            {bundle.payments.map((p) => (
              <li key={p.id}>
                ${p.amount.toFixed(2)} · {p.status} ·{" "}
                {new Date(p.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Prefill Design notes + Estimate line items from LiDAR / RoomPlan measurements.
 */

import type {
  LineItemCategory,
  MeasurementRecord,
  DesignSpecRecord,
} from "./types";

export function lengthInches(m: MeasurementRecord): number {
  if (m.annotation?.realLength != null) {
    return m.unit === "ft"
      ? m.annotation.realLength * 12
      : m.annotation.realLength;
  }
  const primary = m.width ?? m.height ?? 0;
  return m.unit === "ft" ? primary * 12 : primary;
}

export function formatInches(inches: number): string {
  const whole = Math.floor(inches);
  const frac = Math.round((inches - whole) * 16) / 16;
  const feet = Math.floor(whole / 12);
  const rem = whole % 12;
  if (feet > 0) {
    return `${feet}' ${rem}${frac ? ` ${frac}` : ""}"`;
  }
  return `${whole}${frac ? ` ${frac}` : ""}"`;
}

export function buildDesignNotesFromMeasurements(
  existingNotes: string,
  measurements: MeasurementRecord[],
): string {
  const block = measurements
    .map((m) => {
      if (m.width != null && m.height != null) {
        const unit = m.unit;
        const area =
          unit === "ft"
            ? (m.width * m.height).toFixed(2) + " sq ft"
            : ((m.width * m.height) / 144).toFixed(2) + " sq ft";
        return `• ${m.label}: ${m.width} × ${m.height} ${unit} (${area})`;
      }
      const inches = lengthInches(m);
      return `• ${m.label}: ${formatInches(inches)} (${inches.toFixed(2)} in)`;
    })
    .join("\n");

  const header = "LiDAR / RoomPlan measurements";
  const stripped = existingNotes
    .replace(new RegExp(`${header}[\\s\\S]*?(?=\\n\\n|$)`, "i"), "")
    .trim();
  return [stripped, `${header}\n${block}`].filter(Boolean).join("\n\n");
}

export function buildDesignDescription(
  existing: string,
  measurements: MeasurementRecord[],
): string {
  const width = measurements.find((m) =>
    /width/i.test(m.label),
  );
  const height = measurements.find((m) =>
    /height/i.test(m.label),
  );
  if (!width && !height) return existing;
  const parts = [
    width ? `Sign width ${formatInches(lengthInches(width))}` : null,
    height ? `Sign height ${formatInches(lengthInches(height))}` : null,
  ].filter(Boolean);
  const line = parts.join(" · ");
  if (!existing.trim()) return line;
  if (existing.includes("Sign width") || existing.includes("Sign height")) {
    return existing;
  }
  return `${existing}\n${line}`;
}

export type PrefillLineItem = {
  category: LineItemCategory;
  description: string;
  qty: number;
  unitCost: number;
  markupPct: number;
  catalogKey?: string | null;
};

/**
 * Seed estimate qty from measured area (sq ft) when width+height present,
 * otherwise leave catalog defaults alone.
 */
export function prefillLineItemsFromMeasurements(
  existing: PrefillLineItem[],
  measurements: MeasurementRecord[],
): PrefillLineItem[] {
  const rect = measurements.find((m) => m.width != null && m.height != null);
  const width = measurements.find((m) => /sign\s*width/i.test(m.label));
  const height = measurements.find((m) => /sign\s*height/i.test(m.label));

  let areaSqFt: number | null = null;
  if (rect && rect.width != null && rect.height != null) {
    areaSqFt =
      rect.unit === "ft"
        ? rect.width * rect.height
        : (rect.width * rect.height) / 144;
  } else if (width && height) {
    const wIn = lengthInches(width);
    const hIn = lengthInches(height);
    areaSqFt = (wIn * hIn) / 144;
  }

  if (areaSqFt == null || areaSqFt <= 0) return existing;

  const qty = Math.round(areaSqFt * 100) / 100;
  if (existing.length === 0) {
    return [
      {
        category: "material",
        description: `Sign face (${qty} sq ft from LiDAR)`,
        qty,
        unitCost: 45,
        markupPct: 40,
        catalogKey: "lidar-area",
      },
    ];
  }

  // Update first material row qty if it looks like a face/panel, else prepend.
  const idx = existing.findIndex(
    (i) =>
      i.category === "material" &&
      (/face|panel|acm|acrylic|letter/i.test(i.description) ||
        i.catalogKey === "lidar-area"),
  );
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = {
      ...next[idx],
      qty,
      description: next[idx].description.includes("sq ft")
        ? next[idx].description
        : `${next[idx].description} (${qty} sq ft from LiDAR)`,
    };
    return next;
  }

  return [
    {
      category: "material",
      description: `Sign face (${qty} sq ft from LiDAR)`,
      qty,
      unitCost: 45,
      markupPct: 40,
      catalogKey: "lidar-area",
    },
    ...existing,
  ];
}

export function summarizePrefill(design: DesignSpecRecord | null) {
  return {
    signType: design?.signType || "Channel letters",
    description: design?.description || "",
    notes: design?.notes || "",
  };
}

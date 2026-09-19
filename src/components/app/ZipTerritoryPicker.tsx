"use client";

import { useMemo, useState } from "react";
import { METRO_ZIP_OPTIONS } from "@/lib/geo/zip-to-metro";
import { cn } from "@/lib/cn";

type Props = {
  /** Max selectable zips (1 Starter / 5 Growth). Pro should not use this. */
  allowance: number;
  /** Currently saved zips */
  initialZips?: string[];
  /** Form field name submitted to the server action */
  name?: string;
  /** Optional free-type for zips not in the curated list (still validated server-side) */
  allowCustom?: boolean;
};

/**
 * Territory picker scoped to the 8 live metros.
 * Selected zips are written into a hidden input for the parent form.
 */
export function ZipTerritoryPicker({
  allowance,
  initialZips = [],
  name = "zips",
  allowCustom = true,
}: Props) {
  const [selected, setSelected] = useState<string[]>(() =>
    initialZips.filter((z) => /^\d{5}$/.test(z)).slice(0, allowance),
  );
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const remaining = allowance - selected.length;
  const value = useMemo(() => selected.join(", "), [selected]);

  function toggle(zip: string) {
    setError(null);
    setSelected((prev) => {
      if (prev.includes(zip)) return prev.filter((z) => z !== zip);
      if (prev.length >= allowance) {
        setError(
          allowance === 1
            ? "Starter includes 1 zip — deselect to choose another."
            : `Your plan allows up to ${allowance} zip codes.`,
        );
        return prev;
      }
      return [...prev, zip];
    });
  }

  function addCustom() {
    setError(null);
    const digits = custom.replace(/\D/g, "").slice(0, 5);
    if (digits.length !== 5) {
      setError("Enter a valid 5-digit US zip.");
      return;
    }
    if (selected.includes(digits)) {
      setCustom("");
      return;
    }
    if (selected.length >= allowance) {
      setError(
        allowance === 1
          ? "Starter includes 1 zip — deselect to choose another."
          : `Your plan allows up to ${allowance} zip codes.`,
      );
      return;
    }
    setSelected((prev) => [...prev, digits]);
    setCustom("");
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={value} />
      <p className="text-xs font-semibold text-slate">
        Selected {selected.length} / {allowance}
        {selected.length > 0 ? ` · ${selected.join(", ")}` : ""}
      </p>

      <div className="max-h-[min(55vh,28rem)] space-y-4 overflow-y-auto rounded-2xl border border-line bg-white p-3">
        {METRO_ZIP_OPTIONS.map((metro) => (
          <div key={metro.city}>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate">
              {metro.label}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {metro.zips.map((zip) => {
                const on = selected.includes(zip);
                const blocked = !on && remaining <= 0;
                return (
                  <button
                    key={zip}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggle(zip)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-bold tabular-nums transition active:scale-[0.98] disabled:opacity-40",
                      on
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-offwhite text-ink hover:border-ink/40",
                    )}
                  >
                    {zip}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            inputMode="numeric"
            maxLength={10}
            placeholder="Or type a covered zip"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm outline-none ring-purple/30 focus:ring-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            className="rounded-full border border-line bg-offwhite px-4 text-sm font-bold text-ink"
          >
            Add
          </button>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-hot">{error}</p>}
    </div>
  );
}

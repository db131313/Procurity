"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MapPinned } from "lucide-react";
import { PICKER_CITIES } from "@/lib/cities/picker";
import { cn } from "@/lib/cn";

const SERVED = PICKER_CITIES.filter((c) => c.served && c.cityCode);

type Props = {
  /** Active CityCode (e.g. nyc, chicago) */
  value: string;
  onChange: (cityCode: string, pickerId: string) => void;
};

/** Metro jump control — sits next to Filters on the map. */
export function MapCityPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current =
    SERVED.find((c) => c.cityCode === value || c.id === value) ?? SERVED[0]!;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select metro"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold shadow-md backdrop-blur transition",
          open
            ? "border-ink bg-ink text-white"
            : "border-line bg-white/95 text-ink",
        )}
      >
        <MapPinned className="h-4 w-4 shrink-0" aria-hidden />
        <span>{current.shortLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Covered metros"
          className="absolute right-0 top-full z-40 mt-2 max-h-[min(60vh,22rem)] w-52 overflow-y-auto rounded-2xl border-2 border-line bg-white py-1.5 shadow-xl"
        >
          {SERVED.map((c) => {
            const active = c.cityCode === value || c.id === value;
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm font-semibold",
                    active
                      ? "bg-offwhite text-ink"
                      : "text-slate hover:bg-offwhite hover:text-ink",
                  )}
                  onClick={() => {
                    onChange(c.cityCode!, c.id);
                    setOpen(false);
                  }}
                >
                  <span>{c.shortLabel}</span>
                  <span className="text-[11px] font-medium text-slate/80">
                    {c.state}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

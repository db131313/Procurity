"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  lat: number;
  lng: number;
  className?: string;
};

type MetaResponse = {
  configured?: boolean;
  available?: boolean;
  dateLabel?: string | null;
  imagePath?: string | null;
  reportProblemUrl?: string | null;
  attribution?: string | null;
  status?: string;
};

/**
 * Full-width street-imagery header for project overlays (Mapillary).
 * Metadata first; clean fallback when no token / no coverage.
 */
export function StreetViewHeader({ lat, lng, className }: Props) {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setImgError(false);
    void fetch(
      `/api/streetview?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
      { credentials: "same-origin" },
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as MetaResponse;
      })
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setMeta({ available: false, configured: false });
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const showImage = Boolean(meta?.available && meta.imagePath && !imgError);
  // Fixed height so sheet animation doesn't jump when imagery resolves
  const frameClass = "h-56 w-full sm:h-72 md:h-80";

  return (
    <div className={cn("relative overflow-hidden bg-ink", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied API image
        <img
          src={meta!.imagePath!}
          alt="Street-level photo of project location"
          className={cn(frameClass, "object-cover")}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            frameClass,
            "flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink to-slate/80 text-white/70",
          )}
        >
          <MapPin className="h-7 w-7" aria-hidden />
          <p className="text-xs font-semibold tracking-wide">
            {meta == null
              ? "Checking street imagery…"
              : meta.configured === false
                ? "Street imagery not configured"
                : "No street imagery for this location"}
          </p>
        </div>
      )}

      {showImage && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-[11px] text-white">
          <div>
            <p className="font-bold tracking-wide">
              Street View
              {meta?.dateLabel ? `: ${meta.dateLabel}` : ""}
            </p>
            <p className="text-white/75">
              Imagery © Mapillary — not live / not real-time
            </p>
          </div>
          {meta?.reportProblemUrl && (
            <a
              href={meta.reportProblemUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 underline decoration-white/50 underline-offset-2 hover:decoration-white"
            >
              View on Mapillary
            </a>
          )}
        </div>
      )}
    </div>
  );
}

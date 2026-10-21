"use client";

import { useEffect, useState } from "react";
import { AppWaitlistForm } from "./AppWaitlistForm";
import { cn } from "@/lib/cn";

const IOS_URL = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

/**
 * Accurate list of what the iOS companion does today.
 * Do not claim map/pipeline/quotes — those are web-only for now.
 */
const FEATURES = [
  "LiDAR point-to-point measuring in feet and inches",
  "Room scans with the TrueDepth / LiDAR camera",
  "Snapshots with dimension lines overlaid",
  "Automatic upload into the matching Procurity job",
];

type Props = {
  /** When true, omit outer section chrome (used inside asymmetric home layout) */
  embedded?: boolean;
};

export function IphoneAppSection({ embedded = false }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!IOS_URL || typeof window === "undefined") return;
    let cancelled = false;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(IOS_URL, {
          width: 160,
          margin: 1,
          color: { dark: "#14213D", light: "#FBF7F0" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const body = (
    <div
      className={cn(
        embedded
          ? "flex flex-col gap-8"
          : "mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2",
      )}
    >
      <div className={cn("relative mx-auto w-[200px]", !embedded && "md:mx-0")}>
        <div className="relative overflow-hidden rounded-[2rem] border-[5px] border-[#14213D] bg-[#14213D]">
          <div className="flex h-[400px] flex-col bg-[#1a2744] p-4 text-[#FBF7F0]">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-[#FBF7F0]/20" />
            <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm font-medium">LiDAR measure</p>
              <p className="text-xs text-[#FBF7F0]/60">12′ 4″ · wall to wall</p>
              <div className="mt-4 h-24 w-full rounded-xl border border-dashed border-[#E7DFD0]/30 bg-[#FBF7F0]/5" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl tracking-tight text-[#14213D] md:text-3xl">
          Measure on site with LiDAR
        </h2>
        <ul className="mt-5 space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-[#5B6475]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[#5B6475]">
          Needs an iPhone 12 Pro or newer, or an iPad Pro.
        </p>

        {IOS_URL ? (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={IOS_URL}
              className="mkt-btn-primary inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium"
            >
              Get the iPhone app
            </a>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR code for the iPhone app"
                width={72}
                height={72}
                className="rounded-lg border border-[#E7DFD0]"
              />
            )}
          </div>
        ) : (
          <div className="mt-6">
            <AppWaitlistForm />
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <section className="border-t border-[#E7DFD0] px-5 py-14 md:px-10 md:py-16">
      {body}
    </section>
  );
}

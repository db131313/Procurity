"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { AppWaitlistForm } from "./AppWaitlistForm";

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

export function IphoneAppSection() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!IOS_URL || typeof window === "undefined") return;
    let cancelled = false;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(IOS_URL, {
          width: 160,
          margin: 1,
          color: { dark: "#0B0F19", light: "#FFFFFF" },
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

  return (
    <section className="border-t border-white/40 px-5 py-14 md:px-10 md:py-16">
      <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
        <div className="relative mx-auto w-[220px]">
          <div className="brand-gradient absolute -inset-6 rounded-[2.5rem] opacity-40 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink shadow-xl">
            <div className="flex h-[420px] flex-col bg-gradient-to-b from-[#1e293b] to-[#0B0F19] p-4 text-white">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/20" />
              <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Smartphone className="h-10 w-10 text-white/80" aria-hidden />
                <p className="text-sm font-bold">LiDAR measure</p>
                <p className="text-xs text-white/60">12′ 4″ · wall to wall</p>
                <div className="mt-4 h-24 w-full rounded-xl border border-dashed border-white/20 bg-white/5" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Measure on site with{" "}
            <span className="brand-gradient-text">LiDAR</span>
          </h2>
          <ul className="mt-5 space-y-2.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-slate">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate">
            Needs an iPhone 12 Pro or newer, or an iPad Pro.
          </p>

          {IOS_URL ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href={IOS_URL}
                className="brand-gradient inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold text-white"
                target="_blank"
                rel="noreferrer"
              >
                Download for iPhone
              </a>
              {qrDataUrl && (
                <div className="hidden rounded-xl border border-line bg-white p-2 shadow-sm md:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR code to download the iPhone app" width={96} height={96} />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
              <p className="text-sm font-bold text-ink">Coming soon</p>
              <p className="mt-1 text-xs text-slate">
                Leave your email and we&apos;ll tell you when the app is ready.
              </p>
              <div className="mt-3">
                <AppWaitlistForm source="home" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

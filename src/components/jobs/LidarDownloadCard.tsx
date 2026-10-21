"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { AppWaitlistForm } from "@/components/marketing/AppWaitlistForm";

const IOS_URL = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() || "";

/** Site-capture card: download the real iPhone LiDAR app (or waitlist). */
export function LidarDownloadCard() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!IOS_URL) return;
    let cancelled = false;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(IOS_URL, {
          width: 128,
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
    <div className="rounded-xl border border-line bg-offwhite px-3 py-3 text-sm text-ink">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Scan with iPhone (LiDAR)</p>
          <p className="mt-1 text-xs text-slate">
            Measure point-to-point in feet and inches, scan rooms, snap
            dimensioned photos, and upload straight into this job.
          </p>
          <p className="mt-2 text-[11px] text-slate">
            Needs an iPhone 12 Pro or newer, or an iPad Pro.
          </p>

          {IOS_URL ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href={IOS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-xs font-bold text-white"
              >
                Download the iPhone app
              </a>
              {qrDataUrl && (
                <div className="hidden rounded-lg border border-line bg-white p-1.5 md:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="QR code for the iPhone app"
                    width={72}
                    height={72}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-line bg-white p-3">
              <p className="text-xs font-bold">Coming soon</p>
              <div className="mt-2">
                <AppWaitlistForm source="job_site_capture" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

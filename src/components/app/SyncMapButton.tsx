"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Real sync control for the map. The old "Citywide · run DOB sync" label
 * was plain text and did nothing when clicked.
 */
export function SyncMapButton({
  lastSyncAt,
  projectCount,
  boroughCount,
}: {
  lastSyncAt: string | null;
  projectCount: number;
  boroughCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function runSync() {
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync?city=nyc&days=21", {
          method: "POST",
        });
        const data = (await res.json()) as {
          error?: string;
          detail?: string;
          projectCount?: number;
          sample?: { address: string }[];
        };
        if (!res.ok) {
          throw new Error(data.detail || data.error || `Sync failed (${res.status})`);
        }
        setOkMsg(
          `Synced ${data.projectCount?.toLocaleString() ?? "?"} NYC sites` +
            (data.sample?.[0]?.address ? ` · e.g. ${data.sample[0].address}` : ""),
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
      }
    });
  }

  const label = lastSyncAt
    ? `Live · ${boroughCount} boroughs · ${projectCount.toLocaleString()} sites`
    : "Citywide · run DOB sync";

  return (
    <div className="pointer-events-auto flex max-w-[min(100vw-1.5rem,24rem)] flex-col gap-1.5">
      <button
        type="button"
        onClick={runSync}
        disabled={pending}
        className="rounded-full border border-line bg-white/95 px-3 py-1.5 text-left text-[11px] font-bold text-slate shadow-sm backdrop-blur transition hover:border-purple/40 hover:text-ink disabled:opacity-60"
        title="Pull latest NYC DOB filings into the map"
      >
        {pending ? "Syncing NYC permits…" : label}
      </button>
      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-950">
          {error}
        </p>
      )}
      {okMsg && !error && (
        <p className="rounded-xl border border-teal/30 bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-ink">
          {okMsg}
        </p>
      )}
    </div>
  );
}

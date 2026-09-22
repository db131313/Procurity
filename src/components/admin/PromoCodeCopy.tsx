"use client";

import { useState } from "react";

export function PromoCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <code className="flex-1 rounded-xl border border-line bg-offwhite px-3 py-2 font-mono text-sm font-bold tracking-wide text-ink">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        className="h-10 shrink-0 rounded-full bg-ink px-4 text-xs font-bold text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

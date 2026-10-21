"use client";

import { useState } from "react";

export function DemoShareCopy({
  label,
  path,
  origin,
}: {
  label: string;
  path: string;
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : origin
        ? `${origin}${path}`
        : path;

  async function copy() {
    const full =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : url;
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-11 items-center rounded-full border border-line bg-white px-3 text-xs font-bold text-ink hover:border-[#2563EB]/40"
    >
      {copied ? "Copied" : `Copy ${label}`}
    </button>
  );
}

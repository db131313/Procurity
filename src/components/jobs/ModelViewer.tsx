"use client";

import { useEffect, useRef } from "react";

/**
 * Loads Google <model-viewer> for GLB / USDZ when possible.
 * OBJ/PLY fall back to a download link (no fake LiDAR).
 */
export function ModelViewer({
  src,
  fileName,
}: {
  src: string;
  fileName: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const lower = fileName.toLowerCase();
  const supported =
    lower.endsWith(".glb") ||
    lower.endsWith(".gltf") ||
    lower.endsWith(".usdz");

  useEffect(() => {
    if (!supported) return;
    const existing = document.querySelector(
      'script[data-model-viewer="1"]',
    );
    if (!existing) {
      const s = document.createElement("script");
      s.type = "module";
      s.src =
        "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
      s.dataset.modelViewer = "1";
      document.head.appendChild(s);
    }
  }, [supported]);

  if (!supported) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-offwhite px-3 py-4 text-sm text-slate">
        3D preview needs GLB/USDZ.{" "}
        <a href={src} className="font-semibold text-purple underline" download>
          Download {fileName}
        </a>
      </div>
    );
  }

  return (
    <div ref={host} className="overflow-hidden rounded-xl border border-line bg-ink">
      {/* @ts-expect-error model-viewer web component */}
      <model-viewer
        src={src}
        alt={fileName}
        camera-controls
        touch-action="pan-y"
        style={{ width: "100%", height: "240px", background: "#111" }}
      />
    </div>
  );
}

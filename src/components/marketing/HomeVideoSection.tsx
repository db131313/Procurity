"use client";

const VIDEO_URL = process.env.NEXT_PUBLIC_HOME_VIDEO_URL?.trim() || "";
const POSTER_URL = process.env.NEXT_PUBLIC_HOME_VIDEO_POSTER?.trim() || "";

export function HomeVideoSection() {
  return (
    <section className="border-t border-white/40 px-5 py-14 md:px-10 md:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
          See it in{" "}
          <span className="brand-gradient-text">use</span>
        </h2>
        <div className="mt-6 overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-sm">
          {VIDEO_URL ? (
            <video
              className="aspect-video w-full bg-ink"
              src={VIDEO_URL}
              poster={POSTER_URL || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              controls
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50 px-6">
              <div className="rounded-2xl border border-line bg-white/90 px-6 py-8 shadow-sm">
                <p className="text-sm font-bold text-ink">Video coming soon</p>
                <p className="mt-1 text-xs text-slate">
                  A short walkthrough of the map and LiDAR measure flow.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

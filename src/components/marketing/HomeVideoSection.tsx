"use client";

const VIDEO_URL = process.env.NEXT_PUBLIC_HOME_VIDEO_URL?.trim() || "";
const POSTER_URL = process.env.NEXT_PUBLIC_HOME_VIDEO_POSTER?.trim() || "";

type Props = {
  embedded?: boolean;
};

export function HomeVideoSection({ embedded = false }: Props) {
  const body = (
    <div className={embedded ? "" : "mx-auto max-w-4xl"}>
      <h2 className="font-display text-2xl tracking-tight text-[#14213D] md:text-3xl">
        See it in use
      </h2>
      <p className="mt-2 max-w-md text-sm text-[#5B6475]">
        A short look at the map and LiDAR measure flow.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border border-[#E7DFD0] bg-[#FBF7F0]">
        {VIDEO_URL ? (
          <video
            className="aspect-video w-full bg-[#14213D]"
            src={VIDEO_URL}
            poster={POSTER_URL || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            controls
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-[#EDE6DA] px-6">
            <div className="text-center">
              <p className="text-sm font-medium text-[#14213D]">
                Video coming soon
              </p>
              <p className="mt-1 text-xs text-[#5B6475]">
                A short walkthrough of the map and LiDAR measure flow.
              </p>
            </div>
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

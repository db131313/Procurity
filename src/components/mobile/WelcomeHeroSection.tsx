"use client";

import dynamic from "next/dynamic";

const WelcomeMapHero = dynamic(
  () =>
    import("@/components/mobile/WelcomeMapHero").then((m) => m.WelcomeMapHero),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[280px] animate-pulse rounded-[28px] bg-gradient-to-br from-violet-100 to-teal-50" />
    ),
  },
);

type Pin = {
  id: string;
  score: number;
  lng: number;
  lat: number;
  hot?: boolean;
};

export function WelcomeHeroSection({
  pins,
  className,
}: {
  pins: Pin[];
  className?: string;
}) {
  return <WelcomeMapHero pins={pins} className={className} />;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { TeaserMapLazy } from "@/components/marketing/TeaserMapLazy";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import {
  getPickerCity,
  TEASER_PIN_LIMIT,
} from "@/lib/cities/picker";
import { listProjects } from "@/lib/db/store";
import { ensureMapDataFresh } from "@/lib/map/ensure-fresh";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ city: string }>;
};

export default async function TeaserCityPage({ params }: Props) {
  const { city: cityParam } = await params;
  const city = getPickerCity(cityParam);
  if (!city) notFound();

  if (!city.served || !city.cityCode) {
    return (
      <div className="min-h-[100dvh] bg-offwhite">
        <div className="relative bg-ink text-white">
          <MarketingNav />
          <div className="mx-auto max-w-lg px-5 pb-16 pt-28">
            <p className="text-xs font-bold uppercase tracking-wide text-white/50">
              Coming soon
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              We&apos;re not in {city.label} yet — join the waitlist
            </h1>
            <p className="mt-3 text-white/70">
              We&apos;re wiring live permit feeds city by city. Leave your email
              and we&apos;ll notify you when {city.shortLabel} goes live.
            </p>
            <div className="mt-8 rounded-3xl bg-white p-5 text-ink shadow-xl">
              <WaitlistForm cityLabel={city.label} />
            </div>
            <Link
              href="/"
              className="mt-6 inline-block text-sm font-semibold text-white/70 hover:text-white"
            >
              ← Back to cities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Best-effort sync so teaser has pins (public page — no auth).
  await ensureMapDataFresh();
  const projects = await listProjects({ city: city.cityCode });
  const totalCount = projects.length;
  const pins = projects.slice(0, TEASER_PIN_LIMIT).map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    permitType: p.jobType || p.buildingType || p.phase.replace(/_/g, " "),
    // Rough location only — strip unit / suite detail
    addressRough: p.address.split(",")[0]?.replace(/\d+/g, "···") || "Project site",
  }));

  return (
    <div className="min-h-[100dvh] bg-offwhite">
      <div className="relative border-b border-line bg-ink text-white">
        <MarketingNav />
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-24 md:pt-28">
          <p className="text-xs font-bold uppercase tracking-wide text-teal">
            {city.label} · live preview
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            {totalCount > 0
              ? `${totalCount.toLocaleString()} active projects in ${city.shortLabel}`
              : `Exploring ${city.label}`}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/70 md:text-base">
            Preview the map for about 15 seconds — pins show permit type and rough
            location only. Full Buy Scores and contacts require signup + checkout.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 md:py-8">
        {pins.length > 0 ? (
          <TeaserMapLazy
            cityId={city.id}
            cityLabel={city.label}
            center={city.center}
            zoom={city.zoom}
            pins={pins}
            totalCount={Math.max(totalCount, pins.length)}
          />
        ) : (
          <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
            <p className="font-bold text-ink">Loading {city.label} permits…</p>
            <p className="mt-2 text-sm text-slate">
              Data is syncing.{" "}
              <Link
                href={`/signup?city=${city.id}&checkout=1&tier=growth`}
                className="font-semibold text-purple"
              >
                Sign up
              </Link>{" "}
              to get notified when pins are ready.
            </p>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-slate">
          <Link href="/" className="font-semibold text-purple">
            Choose another city
          </Link>
        </p>
      </div>
    </div>
  );
}

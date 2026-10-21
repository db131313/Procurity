import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPickerCity } from "@/lib/cities/picker";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ city: string }>;
};

/**
 * Legacy /teaser/[city] URLs redirect to the home map with that city selected.
 */
export default async function TeaserCityPage({ params }: Props) {
  const { city: cityParam } = await params;
  const city = getPickerCity(cityParam);
  if (!city) notFound();

  if (!city.served) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="text-2xl font-bold text-ink">
          We&apos;re not in {city.label} yet
        </h1>
        <p className="mt-3 text-slate">
          Join the waitlist and we&apos;ll email you when this city goes live.
        </p>
        <Link
          href={`/waitlist`}
          className="mt-6 inline-flex h-12 items-center rounded-full bg-[#2563EB] px-5 text-sm font-bold text-white"
        >
          Join waitlist
        </Link>
        <p className="mt-4">
          <Link href="/" className="text-sm font-semibold text-[#2563EB]">
            ← Back to map
          </Link>
        </p>
      </div>
    );
  }

  // Persist city via cookie on next home load by query — home reads cookie;
  // set cookie via redirect to / with Set-Cookie would need a route handler.
  // Simplest: redirect to / and let client city picker; also set cookie header.
  redirect(`/?city=${encodeURIComponent(city.id)}`);
}

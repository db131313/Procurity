import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { HomePage } from "@/components/marketing/HomePage";
import { getSession } from "@/lib/auth/session";
import { CITY_COOKIE, getPickerCity } from "@/lib/cities/picker";
import { resolveHomeCityId } from "@/lib/cities/nearest";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const hdrs = await headers();

  const cityId = resolveHomeCityId({
    headers: hdrs,
    cookieCityId: getPickerCity(jar.get(CITY_COOKIE)?.value)?.id,
    queryCityId: getPickerCity(sp.city)?.id,
  });

  const session = await getSession();
  // Logged-in users go straight to the app map — home teaser is for visitors.
  if (session) {
    redirect(`/app/map?city=${encodeURIComponent(cityId)}`);
  }

  return <HomePage initialCityId={cityId} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomePage } from "@/components/marketing/HomePage";
import { getSession } from "@/lib/auth/session";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  getPickerCity,
} from "@/lib/cities/picker";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ city?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const fromQuery = getPickerCity(sp.city)?.id;
  const fromCookie = getPickerCity(jar.get(CITY_COOKIE)?.value)?.id;
  const cityId = fromQuery || fromCookie || DEFAULT_CITY_ID;

  const session = await getSession();
  // Logged-in users go straight to the app map — home teaser is for visitors.
  if (session) {
    redirect(`/app/map?city=${encodeURIComponent(cityId)}`);
  }

  // City cookie is written client-side when the visitor picks a city.
  return <HomePage initialCityId={cityId} />;
}

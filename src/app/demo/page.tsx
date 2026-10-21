import { cookies } from "next/headers";
import { DemoExperience } from "@/components/demo/DemoExperience";
import { canAccessLiveDemo } from "@/lib/demo/auth";
import {
  CITY_COOKIE,
  DEFAULT_CITY_ID,
  getPickerCity,
} from "@/lib/cities/picker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Procurity demo — map to paid deposit",
  description:
    "Try Procurity in five steps: map, project card, measure, quote, and get paid. No login required.",
};

type Props = {
  searchParams: Promise<{
    city?: string;
    live?: string;
    present?: string;
  }>;
};

export default async function DemoPage({ searchParams }: Props) {
  const sp = await searchParams;
  const jar = await cookies();
  const cookieCity = jar.get(CITY_COOKIE)?.value;
  const fromQuery = getPickerCity(sp.city)?.id;
  const fromCookie = getPickerCity(cookieCity)?.id;
  const cityId = fromQuery || fromCookie || DEFAULT_CITY_ID;

  const liveRequested = sp.live === "1" || sp.live === "true";
  const presentMode = sp.present === "1" || sp.present === "true";
  const liveAccess = await canAccessLiveDemo();
  const liveMode = liveRequested && liveAccess.ok;

  return (
    <DemoExperience
      initialCityId={cityId}
      liveMode={liveMode}
      presentMode={presentMode}
      canUseLive={liveAccess.ok}
    />
  );
}

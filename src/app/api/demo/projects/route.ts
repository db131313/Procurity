import { NextResponse } from "next/server";
import { getPickerCity, DEFAULT_CITY_ID } from "@/lib/cities/picker";
import { getPublicDemoProjects } from "@/lib/demo/public-projects";

export const dynamic = "force-dynamic";

/** Public demo projects — past buying window only, contacts always masked. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityParam = url.searchParams.get("city") || DEFAULT_CITY_ID;
  const city = getPickerCity(cityParam);
  const cityId = city?.id || DEFAULT_CITY_ID;

  const result = await getPublicDemoProjects(cityId);
  return NextResponse.json(
    { ok: true, ...result },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        "Netlify-Vary": "query=city",
      },
    },
  );
}

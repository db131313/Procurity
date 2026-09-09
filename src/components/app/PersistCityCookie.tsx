"use client";

import { useEffect } from "react";
import { CITY_COOKIE } from "@/lib/cities/picker";

/** Persist the user's chosen city for /app/map defaultCity. */
export function PersistCityCookie({ cityId }: { cityId: string }) {
  useEffect(() => {
    try {
      document.cookie = `${CITY_COOKIE}=${encodeURIComponent(cityId)};path=/;max-age=31536000;samesite=lax`;
    } catch {
      // ignore
    }
  }, [cityId]);
  return null;
}

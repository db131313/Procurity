"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { WorkingPill } from "@/components/ui/WorkingIndicator";
import { zipToMetro } from "@/lib/geo/zip-to-metro";
import {
  PLAN_MY_DAY_STOP_LIMIT,
  buildAgentRouteMessage,
  saveMapRoute,
  type RouteResult,
} from "@/lib/route/types";

type Props = {
  zipCodes: string[];
  defaultCity: string;
};

/**
 * Thin agent orchestration: pick area from account zips / default city,
 * call the existing route generator, hand off to the map + Start FAB.
 */
export function PlanMyDayOrchestrator({ zipCodes, defaultCity }: Props) {
  const router = useRouter();
  const started = useRef(false);
  const [status, setStatus] = useState("Agent is planning your day…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const zips = zipCodes.filter((z) => /^\d{5}$/.test(z));
        const primaryZip = zips[0];

        let body: Record<string, unknown>;
        let cityForMap = defaultCity || "nyc";

        if (zips.length === 1 && primaryZip) {
          // Single territory zip — route that zip directly.
          body = {
            mode: "zip",
            zip: primaryZip,
            limit: PLAN_MY_DAY_STOP_LIMIT,
          };
          const metro = zipToMetro(primaryZip);
          if (metro.covered) cityForMap = metro.city;
        } else if (zips.length > 1 && primaryZip) {
          // Multi-zip: near-me in the primary zip's metro; API still applies allowlist.
          const metro = zipToMetro(primaryZip);
          if (metro.covered) cityForMap = metro.city;
          const geo = await tryGeolocation();
          body = {
            mode: "near",
            city: cityForMap,
            limit: PLAN_MY_DAY_STOP_LIMIT,
            ...geo,
          };
        } else {
          // Pro / no zips — near-me around saved default city.
          const geo = await tryGeolocation();
          body = {
            mode: "near",
            city: cityForMap,
            limit: PLAN_MY_DAY_STOP_LIMIT,
            ...geo,
          };
        }

        setStatus("Scoring today’s top stops…");
        const res = await fetch("/api/route/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as RouteResult & { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not plan your day");
          return;
        }
        if (!data.stops?.length) {
          setError(
            data.message ||
              "No strong opportunities found in your area today. Try the manual route planner.",
          );
          return;
        }

        const framed: RouteResult = {
          ...data,
          agentMessage: buildAgentRouteMessage({
            stopCount: data.stopCount,
            mode: data.mode,
            zip: data.zip,
          }),
        };
        saveMapRoute(framed);
        setStatus(
          framed.agentMessage ||
            `Found ${framed.stopCount} stops — opening map…`,
        );
        const qs = new URLSearchParams({
          route: "1",
          agent: "1",
          city: data.city || cityForMap,
        });
        router.replace(`/app/map?${qs.toString()}`);
      } catch {
        setError("Something went wrong planning your day. Try again.");
      }
    })();
  }, [zipCodes, defaultCity, router]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Agent
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
          Plan My Day
        </h1>
        {error ? (
          <>
            <p className="mt-3 text-sm text-slate">{error}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href="/app/route"
                className="inline-flex h-11 items-center rounded-full border-2 border-line bg-white px-5 text-sm font-bold text-ink"
              >
                Open route planner
              </a>
              <a
                href="/app/map"
                className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-bold text-white"
              >
                Back to map
              </a>
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <WorkingPill agent>{status}</WorkingPill>
            <p className="text-xs text-slate">
              This usually takes a few seconds…
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

async function tryGeolocation(): Promise<{
  latitude?: number;
  longitude?: number;
}> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return {};
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 6_000,
        maximumAge: 30_000,
      });
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
  } catch {
    return {};
  }
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Map3D } from "@/components/Map3D";
import { UpgradeButton } from "@/components/UpgradeButton";
import { formatCurrency, formatShortDate, scoreTone } from "@/lib/format";
import type { ScoredSite, Top20Response } from "@/lib/types";

const BOROUGHS = ["All NYC", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

type Props = {
  initial: Top20Response & { plan: "free" | "pro" };
  userName: string;
};

export function DashboardClient({ initial, userName }: Props) {
  const [data, setData] = useState(initial);
  const [borough, setBorough] = useState(initial.boroughFilter || "All NYC");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.sites[0]?.id ?? null,
  );
  const [pending, startTransition] = useTransition();
  const isPro = data.plan === "pro";

  const selected = useMemo(
    () => data.sites.find((s) => s.id === selectedId) ?? data.sites[0] ?? null,
    [data.sites, selectedId],
  );

  function refresh(nextBorough: string) {
    setBorough(nextBorough);
    startTransition(async () => {
      const params = new URLSearchParams();
      if (nextBorough !== "All NYC") params.set("borough", nextBorough);
      const res = await fetch(`/api/intel/top20?${params.toString()}`);
      if (!res.ok) return;
      const json = (await res.json()) as Top20Response & { plan: "free" | "pro" };
      setData(json);
      setSelectedId(json.sites[0]?.id ?? null);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="animate-rise">
          <p className="text-sm uppercase tracking-[0.22em] text-teal-bright/80">
            Field brief · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <h1 className="brand-mark mt-2 text-3xl font-bold tracking-tight md:text-5xl">
            Top 20 sites to visit today
          </h1>
          <p className="mt-2 max-w-2xl text-sand/70">
            Hey {userName.split(" ")[0]}, here&apos;s who is inside the signage
            procurement window — ranked by buy-readiness from live NYC DOB filings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 animate-rise-delay">
          <label className="text-sm text-sand/60">
            Borough
            <select
              value={borough}
              onChange={(e) => refresh(e.target.value)}
              className="ml-2 rounded-md border border-[var(--line)] bg-ink/60 px-3 py-2 text-sand outline-none"
            >
              {BOROUGHS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          {!isPro && <UpgradeButton label="Unlock full contacts" />}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="min-h-[420px] animate-rise-delay">
          <Map3D
            sites={data.sites}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
          <p className="mt-2 text-xs text-sand/45">
            Source: {data.dataSource}
            {data.note ? ` · ${data.note}` : ""}
            {pending ? " · Refreshing…" : ""}
          </p>
        </section>

        <section className="animate-rise-delay-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="brand-mark text-xl font-semibold">Ranked visit list</h2>
            <span className="inline-flex items-center gap-2 text-xs text-sand/55">
              <span className="live-dot h-2 w-2 rounded-full bg-teal-bright" />
              Live intel
            </span>
          </div>
          {data.sites.length === 0 ? (
            <p className="rounded-lg border border-[var(--line)] bg-ink/35 px-4 py-6 text-sm text-sand/65">
              {data.note || "No sites matched this filter."}
            </p>
          ) : (
            <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {data.sites.map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  active={site.id === selected?.id}
                  isPro={isPro}
                  onSelect={() => setSelectedId(site.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected && (
        <SiteDetail site={selected} isPro={isPro} />
      )}
    </div>
  );
}

function SiteRow({
  site,
  active,
  isPro,
  onSelect,
}: {
  site: ScoredSite;
  active: boolean;
  isPro: boolean;
  onSelect: () => void;
}) {
  const tone = scoreTone(site.probabilityScore);
  const toneClass =
    tone === "hot"
      ? "border-amber/50 bg-amber/10"
      : tone === "open"
        ? "border-teal-bright/40 bg-teal/10"
        : "border-[var(--line)] bg-ink/35";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-lg border px-3 py-3 text-left transition ${toneClass} ${
          active ? "ring-2 ring-teal-bright/50" : "hover:border-sand/25"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-sand/50">
              #{site.rank} · {site.borough}
              {site.signWork ? " · SIGN work" : ""}
            </p>
            <p className="mt-0.5 font-semibold">{site.address}</p>
            <p className="mt-1 text-xs text-sand/60">
              {site.jobType} · {site.filingStatus}
            </p>
          </div>
          <div className="text-right">
            <p className="brand-mark text-2xl font-bold tabular-nums">
              {site.probabilityScore}
              <span className="text-sm text-sand/55">%</span>
            </p>
            <p className="text-[11px] text-sand/55">{site.windowLabel}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-sand/65">
          {isPro
            ? site.contact.ownerBusiness ||
              site.contact.ownerName ||
              site.contact.applicantBusiness ||
              "Contact on file"
            : "•••• contact locked on Free"}
          {isPro && site.contact.phone ? ` · ${site.contact.phone}` : ""}
        </p>
      </button>
    </li>
  );
}

function SiteDetail({ site, isPro }: { site: ScoredSite; isPro: boolean }) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[rgba(8,20,27,0.55)] p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-teal-bright/80">Selected target</p>
          <h3 className="brand-mark mt-1 text-2xl font-bold md:text-3xl">
            #{site.rank} · {site.address}
          </h3>
          <p className="mt-1 text-sand/65">
            {site.borough}
            {site.nta ? ` · ${site.nta}` : ""} · BIN {site.bin || "—"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--line)] px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wider text-sand/50">Buy probability</p>
          <p className="brand-mark text-4xl font-bold tabular-nums">
            {site.probabilityScore}%
          </p>
          <p className="text-sm text-amber">{site.windowLabel}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <h4 className="text-sm font-semibold text-sand/80">Why this score</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-sand/65">
            {site.windowReason.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-sand/80">Project intel</h4>
          <dl className="mt-2 space-y-1 text-sm text-sand/65">
            <div>Type: {site.jobType}</div>
            <div>Status: {site.filingStatus}</div>
            <div>Cost: {formatCurrency(site.initialCost)}</div>
            <div>Stories: {site.stories ?? "—"}</div>
            <div>Filed: {formatShortDate(site.filingDate)}</div>
            <div>First permit: {formatShortDate(site.firstPermitDate)}</div>
          </dl>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-sand/80">Who to call</h4>
          {isPro ? (
            <dl className="mt-2 space-y-1 text-sm text-sand/65">
              <div>
                Owner: {site.contact.ownerName || "—"}
                {site.contact.ownerBusiness ? ` · ${site.contact.ownerBusiness}` : ""}
              </div>
              <div>
                Applicant: {site.contact.applicantName || "—"}
                {site.contact.applicantTitle ? ` (${site.contact.applicantTitle})` : ""}
              </div>
              <div>Firm: {site.contact.applicantBusiness || "—"}</div>
              <div>
                Expeditor: {site.contact.filingRepName || "—"}
                {site.contact.filingRepBusiness
                  ? ` · ${site.contact.filingRepBusiness}`
                  : ""}
              </div>
              <div className="font-medium text-teal-bright">
                Phone: {site.contact.phone || "Not in permit extract"}
              </div>
            </dl>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-sand/55">
                Contacts are a Pro feature — upgrade to see owner, applicant, and
                permittee phone numbers.
              </p>
              <UpgradeButton />
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-sand/60">
        {site.jobDescription}
      </p>
    </section>
  );
}

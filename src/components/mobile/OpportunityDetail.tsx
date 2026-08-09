"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneShell } from "@/components/mobile/PhoneShell";
import type { OpportunityView } from "@/lib/opportunity";
import { addToPipeline } from "@/lib/pipeline";

export function OpportunityDetail({ site }: { site: OpportunityView }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function onAdd() {
    addToPipeline(site);
    setAdded(true);
    setTimeout(() => router.push("/pipeline?added=1"), 350);
  }

  return (
    <PhoneShell>
      <main className="min-h-[100dvh] bg-white px-5 pb-8 pt-4">
        <div className="flex items-center justify-between">
          <Link
            href="/map"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-pc-mist text-pc-ink"
            aria-label="Back"
          >
            ←
          </Link>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-pc-purple">
            {site.heat === "hot" ? "Hot Opportunity" : site.windowLabel}
          </span>
          <div className="w-10" />
        </div>

        <div className="mt-6 flex items-start gap-4 animate-pc-rise">
          <div className="pc-score-ring flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full p-[3px] shadow-md">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
              <span className="text-3xl font-bold text-pc-ink">{site.probabilityScore}</span>
            </div>
          </div>
          <div className="pt-2">
            <h1 className="text-[1.75rem] font-bold leading-tight text-pc-ink">
              {site.title}
            </h1>
            <p className="mt-1 text-sm text-pc-slate">
              {site.address}, {site.borough}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 animate-pc-rise-delay">
          <div className="rounded-2xl border border-pc-line bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pc-slate">
              Est. Opportunity
            </p>
            <p className="mt-1 text-lg font-bold text-pc-ink">{site.estOpportunity}</p>
          </div>
          <div className="rounded-2xl border border-pc-line bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pc-slate">
              Buying Window
            </p>
            <p className="mt-1 text-lg font-bold text-pc-ink">{site.buyingWindow}</p>
          </div>
        </div>

        <section className="mt-7">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-pc-slate">
            Intel
          </h2>
          <div className="mt-3 rounded-2xl border border-pc-line p-4">
            <p className="text-sm font-semibold text-pc-ink">Status</p>
            <p className="mt-1 text-sm text-pc-slate">
              {site.statusLine}
              <span className="text-pc-slate/80"> · {site.permitAgeLabel}</span>
            </p>

            <ul className="mt-4 space-y-3">
              <IntelRow
                label="General Contractor"
                ok={site.hasGc}
                detail={
                  site.contact.phone ||
                  site.contact.filingRepBusiness ||
                  site.contact.filingRepName ||
                  "Detected via permits"
                }
              />
              <IntelRow
                label="Architect / Applicant"
                ok={site.hasArchitect}
                detail={
                  site.contact.applicantBusiness ||
                  site.contact.applicantName ||
                  "On filing"
                }
              />
              <IntelRow
                label="Signage Provider"
                ok={site.hasSignageProvider}
                detail="Not detected"
              />
            </ul>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-pc-slate">
            Likely Solutions
          </h2>
          <div className="mt-3 space-y-2">
            {site.solutions.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between rounded-2xl border border-pc-line px-4 py-3"
              >
                <span className="text-sm font-semibold text-pc-ink">{s.name}</span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
                  {s.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-pc-slate">
          {site.jobDescription}
        </p>

        <button
          type="button"
          onClick={onAdd}
          className="pc-gradient-bg mt-8 flex h-14 w-full items-center justify-center rounded-full text-[16px] font-bold text-white shadow-[0_16px_30px_rgba(124,58,237,0.28)] active:scale-[0.98]"
        >
          {added ? "Added ✓" : "Add to Pipeline"}
        </button>
      </main>
    </PhoneShell>
  );
}

function IntelRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-pc-mist text-pc-slate"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <div>
        <p className="text-sm font-semibold text-pc-ink">{label}</p>
        <p className="text-xs text-pc-slate">{detail}</p>
      </div>
    </li>
  );
}

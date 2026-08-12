import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { StatusChip } from "@/components/ui/StatusChip";
import { getCurrentUser } from "@/lib/auth/session";
import { getProject, listPipeline } from "@/lib/db/store";
import { PHASE_LABELS, type ScoreConfidence } from "@/lib/db/types";
import {
  formatMoneyRange,
  relativeTime,
  scoreBandLabel,
} from "@/lib/format";
import { recommendSourcing } from "@/lib/scoring/engine";
import { addAndMaybeRedirect } from "@/app/actions/pipeline";
import { WhyScore } from "./WhyScore";

function confidenceLabel(c: ScoreConfidence) {
  if (c === "high") return "High confidence";
  if (c === "medium") return "Medium confidence";
  return "Low confidence — limited data";
}

function searchLink(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function nysedLicenseUrl(license: string | null | undefined) {
  if (!license) return null;
  // NY Office of the Professions verification (public, no key)
  return `https://www.op.nysed.gov/verification-search?search_license=${encodeURIComponent(license)}`;
}

function acrisBoroughSearch(address: string, borough: string | null) {
  const boro = (borough || "").toLowerCase();
  // ACRIS party/document search landing — prefilled query via Google site search
  // Direct ACRIS deep-links vary; site search is the durable public entry point.
  const boroHint =
    boro.includes("brooklyn") || boro.includes("kings")
      ? "Kings"
      : boro.includes("queen")
        ? "Queens"
        : boro.includes("bronx")
          ? "Bronx"
          : boro.includes("richmond") || boro.includes("staten")
            ? "Richmond"
            : "New York";
  return searchLink(`${address} ${boroHint} ACRIS property records NYC`);
}

type Lead = {
  role: string;
  why: string;
  name: string | null;
  firm: string | null;
  license: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  findQuery: string;
  extraLinks?: { label: string; href: string }[];
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(decodeURIComponent(id));
  if (!project) notFound();

  const user = await getCurrentUser();
  const pipeline = user ? await listPipeline(user.id) : [];
  const inPipeline = pipeline.some((p) => p.projectId === project.id);

  const sourcing = recommendSourcing({
    tradeScores: project.tradeScores,
    phase: project.phase,
    lastActivityAt: project.lastActivityAt,
    scoreReasons: project.scoreReasons,
  });

  const leads: Lead[] = [];
  if (project.ownerName) {
    leads.push({
      role: "Owner / Developer",
      why: "Ownership entity often sets budget and brand direction for exterior identity.",
      name: project.ownerName,
      firm: project.ownerName,
      license: null,
      phone: null,
      email: null,
      website: null,
      findQuery: `${project.ownerName} owner developer New York`,
      extraLinks: [
        {
          label: "ACRIS property search",
          href: acrisBoroughSearch(project.address, project.borough),
        },
      ],
    });
  }
  if (project.gcName) {
    leads.push({
      role: "General Contractor",
      why: "GCs often manage trade subcontractor selection during finishing.",
      name: project.gcName,
      firm: project.gcName,
      license: null,
      phone: null,
      email: null,
      website: null,
      findQuery: `${project.gcName} general contractor New York`,
    });
  }
  if (project.architectName || project.architectFirm) {
    const lic = nysedLicenseUrl(project.architectLicense);
    leads.push({
      role: "Architect of Record",
      why: "Specifies storefront, lobby, and code-required sign packages.",
      name: project.architectName,
      firm: project.architectFirm,
      license: project.architectLicense,
      phone: project.architectPhone,
      email: project.architectEmail,
      website: project.architectWebsite,
      findQuery: `${project.architectFirm || project.architectName} architect New York`,
      extraLinks: lic
        ? [{ label: "Verify NY license", href: lic }]
        : undefined,
    });
  }
  if (project.engineerName || project.engineerFirm) {
    const lic = nysedLicenseUrl(project.engineerLicense);
    leads.push({
      role: "Professional Engineer",
      why: "Structural/MEP PE may influence facade attachments and power for signs.",
      name: project.engineerName,
      firm: project.engineerFirm,
      license: project.engineerLicense,
      phone: project.engineerPhone,
      email: project.engineerEmail,
      website: project.engineerWebsite,
      findQuery: `${project.engineerFirm || project.engineerName} engineer PE New York`,
      extraLinks: lic
        ? [{ label: "Verify NY license", href: lic }]
        : undefined,
    });
  }
  if (project.filerName || project.filerFirm) {
    leads.push({
      role: "Filer / Expediter",
      why: "Filing rep can confirm status and introduce GC / design team.",
      name: project.filerName,
      firm: project.filerFirm,
      license: null,
      phone: null,
      email: null,
      website: null,
      findQuery: `${project.filerFirm || project.filerName} expediter DOB New York`,
    });
  }

  return (
    <main className="px-5 py-6 md:mx-auto md:max-w-2xl md:px-8 md:py-8">
      <Link
        href="/app/map"
        className="text-sm font-semibold text-purple hover:underline"
      >
        ← Back to map
      </Link>

      <div className="mt-5 flex items-start gap-4">
        <ScoreRing score={project.score} size={88} stroke={7} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-hot">
            {scoreBandLabel(project.score)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {project.address}
          </h1>
          <p className="mt-1 text-sm text-slate">
            {[project.borough, project.zip].filter(Boolean).join(" · ")}
          </p>
          <p
            className={`mt-2 text-xs font-semibold ${
              project.scoreConfidence === "low"
                ? "text-warning"
                : "text-slate"
            }`}
          >
            {confidenceLabel(project.scoreConfidence)}
            {project.scoreConfidence === "low"
              ? " — we have limited data on this one"
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-line">
          {formatMoneyRange(project.estValueLow, project.estValueHigh)}
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm ring-1 ring-line">
          Window {project.buyingWindowEstimate}
        </span>
      </div>

      <div className="mt-4 text-sm text-slate">
        <span className="font-semibold text-ink">
          {PHASE_LABELS[project.phase]}
        </span>
        {" · "}
        Last activity {relativeTime(project.lastActivityAt)}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
          Trade scores
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {(
            [
              ["signage", project.tradeScores.signage, true],
              ["lighting", project.tradeScores.lighting, false],
              ["glass", project.tradeScores.glass, false],
              ["security", project.tradeScores.security, false],
              ["flooring", project.tradeScores.flooring, false],
            ] as const
          ).map(([label, value, primary]) => (
            <span
              key={label}
              className={
                primary
                  ? "rounded-full bg-purple px-3.5 py-2 text-sm font-bold capitalize text-white shadow-sm"
                  : "rounded-full bg-white px-3 py-1.5 text-xs font-bold capitalize text-ink shadow-sm ring-1 ring-line"
              }
            >
              {label} {value}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
          Checklist
        </h2>
        <div className="mt-3 space-y-2">
          <StatusChip status={project.gcName ? "confirmed" : "missing"}>
            GC{project.gcName ? `: ${project.gcName}` : ""}
          </StatusChip>
          <StatusChip status={project.architectName ? "confirmed" : "missing"}>
            Architect
            {project.architectName ? `: ${project.architectName}` : ""}
          </StatusChip>
          <StatusChip status={project.hasSignPermit ? "confirmed" : "pending"}>
            Signage provider
            {project.hasSignPermit
              ? " — sign permit filed"
              : " — no SG permit yet"}
          </StatusChip>
        </div>
      </section>

      <form action={addAndMaybeRedirect} className="mt-6">
        <input type="hidden" name="projectId" value={project.id} />
        <button
          type="submit"
          disabled={inPipeline}
          className="pc-gradient-bg flex h-14 w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
        >
          {inPipeline ? "Already in pipeline" : "Add to Pipeline"}
        </button>
      </form>

      <WhyScore score={project.score} reasons={project.scoreReasons} />

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">
          What This Project Is Likely Sourcing
        </h2>
        <p className="mt-1 text-xs text-slate">
          Driven by this project&apos;s trade scores — not a static list.
        </p>
        {sourcing.length ? (
          <ul className="mt-4 space-y-3">
            {sourcing.map((s) => (
              <li key={s.trade} className="pc-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-ink">{s.trade}</p>
                  <span className="shrink-0 rounded-full bg-offwhite px-2.5 py-1 text-[11px] font-bold text-purple">
                    {s.score}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate">{s.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-offwhite/80 px-4 py-5 text-sm text-slate">
            Not enough signal yet to estimate procurement needs.
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Procurement Leads</h2>
        <p className="mt-1 text-xs text-slate">
          Leads generated from public permit filings — not all contact details
          are available for every project.
        </p>
        {leads.length ? (
          <ul className="mt-4 space-y-3">
            {leads.map((lead) => {
              const display = lead.name || lead.firm;
              return (
                <li key={lead.role} className="pc-card p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate">
                    {lead.role}
                  </p>
                  <p className="mt-1 font-bold text-ink">{display}</p>
                  {lead.firm && lead.name && lead.firm !== lead.name && (
                    <p className="text-sm text-slate">{lead.firm}</p>
                  )}
                  {lead.license && (
                    <p className="mt-1 text-xs text-slate">
                      License {lead.license}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-slate">
                    {lead.why}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-purple">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                        className="hover:underline"
                      >
                        {lead.phone}
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="hover:underline"
                      >
                        {lead.email}
                      </a>
                    )}
                    {lead.website && (
                      <a
                        href={
                          lead.website.startsWith("http")
                            ? lead.website
                            : `https://${lead.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        Website
                      </a>
                    )}
                    {!lead.phone && !lead.email && (
                      <a
                        href={searchLink(lead.findQuery)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        Find contact
                      </a>
                    )}
                    {lead.extraLinks?.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-offwhite/80 px-4 py-5 text-sm text-slate">
            No named owner, GC, architect, engineer, or filer on this filing
            yet.
          </p>
        )}
      </section>

      {project.description && (
        <section className="mt-8 pb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate">
            Filing notes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {project.description}
          </p>
        </section>
      )}
    </main>
  );
}

import { detectPhase, scoreProject } from "@/lib/scoring/engine";
import { scoreAllTrades } from "@/lib/scoring/trades";
import type { Project, ProjectEvent } from "@/lib/db/types";
import type {
  DobApprovedPermit,
  DobCO,
  DobNowFiling,
  DobPermitIssuance,
  LegacyFiling,
} from "./client";

function num(value?: string | null) {
  if (!value) return null;
  const n = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yes(value?: string | null) {
  return String(value ?? "").toUpperCase() === "YES";
}

function name(...parts: (string | undefined | null)[]) {
  const s = parts.filter(Boolean).join(" ").trim();
  return s || null;
}

function projectId(bin: string | null, job: string) {
  return `nyc:${bin || "nobin"}:${job}`;
}

function workTypesFromFiling(f: DobNowFiling): string[] {
  const types: string[] = [];
  if (yes(f.foundation_work_type_) || yes(f.structural_work_type_)) types.push("FO");
  if (yes(f.plumbing_work_type_)) types.push("PL");
  if (yes(f.mechanical_work_type_)) types.push("MH");
  if (yes(f.electrical_work_type_)) types.push("EL");
  if (yes(f.fire_protection_work_type_)) types.push("FA");
  if (yes(f.sign)) types.push("SG");
  if (yes(f.general_construction_work_type_)) types.push("GC");
  return types;
}

const NULL_CONTACTS = {
  architectFirm: null as string | null,
  architectPhone: null as string | null,
  architectEmail: null as string | null,
  architectWebsite: null as string | null,
  engineerName: null as string | null,
  engineerFirm: null as string | null,
  engineerPhone: null as string | null,
  engineerEmail: null as string | null,
  engineerWebsite: null as string | null,
};

/** Map applicant / professional fields onto architect or engineer contacts. */
function contactsFromApplicant(opts: {
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}) {
  const person = name(opts.firstName, opts.lastName);
  const firm = opts.businessName?.trim() || null;
  const title = opts.title ?? "";
  const phone = opts.phone?.trim() || null;
  const email = opts.email?.trim() || null;
  const website = opts.website?.trim() || null;
  const isEngineer = /engineer|p\.?e\.?\b|professional engineer/i.test(title);
  const isArchitect = /architect|ra\b|a\.i\.a/i.test(title);

  if (isEngineer && !isArchitect) {
    return {
      architectName: null as string | null,
      ...NULL_CONTACTS,
      engineerName: person,
      engineerFirm: firm,
      engineerPhone: phone,
      engineerEmail: email,
      engineerWebsite: website,
    };
  }

  // Default: treat applicant as architect / design professional of record
  const architectName =
    isArchitect || !isEngineer
      ? person || firm
      : null;

  return {
    architectName,
    ...NULL_CONTACTS,
    architectFirm: firm,
    architectPhone: phone,
    architectEmail: email,
    architectWebsite: website,
  };
}

export type NormalizeBundle = {
  filings: DobNowFiling[];
  permits: DobPermitIssuance[];
  approved: DobApprovedPermit[];
  cos: DobCO[];
  legacy: LegacyFiling[];
};

export function normalizeProjects(
  bundle: NormalizeBundle,
  previous: Project[] = [],
): { projects: Project[]; events: ProjectEvent[] } {
  const prevById = new Map(previous.map((p) => [p.id, p]));
  const coBins = new Set(
    bundle.cos.map((c) => c.bin).filter(Boolean) as string[],
  );
  const signBins = new Set<string>();
  const gcByBin = new Map<string, string>();
  const workByKey = new Map<string, string[]>();

  for (const p of bundle.permits) {
    const bin = p.bin__ ?? null;
    if (bin && /SG|SIGN/i.test(`${p.work_type ?? ""} ${p.permit_type ?? ""}`)) {
      signBins.add(bin);
    }
    if (bin && p.permittee_s_business_name) {
      gcByBin.set(bin, p.permittee_s_business_name);
    }
  }
  for (const a of bundle.approved) {
    const bin = a.bin ?? null;
    if (bin && /SG|SIGN/i.test(a.work_type ?? "")) signBins.add(bin);
    if (bin && a.work_type) {
      const key = bin;
      workByKey.set(key, [...(workByKey.get(key) ?? []), a.work_type]);
    }
    const gc =
      a.applicant_business_name || a.filing_representative_business_name;
    if (bin && gc && !gcByBin.has(bin)) {
      gcByBin.set(bin, gc);
    }
  }

  const projects: Project[] = [];
  const events: ProjectEvent[] = [];
  const seen = new Set<string>();

  for (const f of bundle.filings) {
    const lat = Number(f.latitude);
    const lng = Number(f.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const job = f.job_filing_number || `${f.bin}-${f.filing_date}`;
    if (!job) continue;
    const bin = f.bin ?? null;
    const id = projectId(bin, job);
    if (seen.has(id)) continue;
    seen.add(id);

    const workTypes = [
      ...workTypesFromFiling(f),
      ...(bin ? workByKey.get(bin) ?? [] : []),
    ];
    const hasSign = yes(f.sign) || (bin ? signBins.has(bin) : false);
    const phaseInfo = detectPhase({
      workTypes,
      jobType: f.job_type,
      hasCO: bin ? coBins.has(bin) : false,
      hasSignPermit: hasSign,
      foundation: yes(f.foundation_work_type_) || yes(f.structural_work_type_),
      mep:
        yes(f.plumbing_work_type_) ||
        yes(f.mechanical_work_type_) ||
        yes(f.electrical_work_type_),
      interior: /alt-?2|alt-?3|interior|fit.?out/i.test(
        `${f.job_type ?? ""} ${f.job_description ?? ""}`,
      ),
    });

    const gcName =
      (bin ? gcByBin.get(bin) : null) ||
      f.filing_representative_business_name ||
      null;
    const contacts = contactsFromApplicant({
      firstName: f.applicant_first_name,
      lastName: f.applicant_last_name,
      businessName: f.applicant_business_name,
      title: f.applicant_professional_title,
      phone: f.applicant_phone,
      email: f.applicant_email,
      website: f.applicant_website,
    });

    const lastActivityAt =
      f.current_status_date ||
      f.approved_date ||
      f.first_permit_date ||
      f.filing_date ||
      new Date().toISOString();

    const scoringInput = {
      phase: phaseInfo.phase,
      lastActivityAt,
      estimatedJobCost: num(f.initial_cost),
      occupancy: f.building_type ?? null,
      buildingType: f.building_type ?? null,
      gcName,
      architectName: contacts.architectName,
      hasSignPermit: hasSign,
      jobType: f.job_type ?? null,
    };
    const scored = scoreProject(scoringInput);
    const tradeScores = scoreAllTrades(scoringInput);

    const project: Project = {
      id,
      city: "nyc",
      bin,
      jobNumber: job,
      address: [f.house_no, f.street_name].filter(Boolean).join(" ") || "Unknown address",
      borough: f.borough ?? null,
      zip: f.postcode ?? null,
      latitude: lat,
      longitude: lng,
      jobType: f.job_type ?? null,
      buildingType: f.building_type ?? null,
      occupancy: f.building_type ?? null,
      description: f.job_description ?? null,
      estimatedJobCost: num(f.initial_cost),
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      score: scored.score,
      scoreReasons: [...phaseInfo.reasons, ...scored.scoreReasons],
      tradeScores,
      estValueLow: scored.estValueLow,
      estValueHigh: scored.estValueHigh,
      buyingWindowEstimate: scored.buyingWindowEstimate,
      gcName,
      architectName: contacts.architectName,
      architectFirm: contacts.architectFirm,
      architectPhone: contacts.architectPhone,
      architectEmail: contacts.architectEmail,
      architectWebsite: contacts.architectWebsite,
      engineerName: contacts.engineerName,
      engineerFirm: contacts.engineerFirm,
      engineerPhone: contacts.engineerPhone,
      engineerEmail: contacts.engineerEmail,
      engineerWebsite: contacts.engineerWebsite,
      ownerName:
        f.owner_s_business_name ||
        name(f.owner_first_name, f.owner_last_name),
      hasSignPermit: hasSign,
      lastActivityAt,
      filingDate: f.filing_date ?? null,
      updatedAt: new Date().toISOString(),
    };

    projects.push(project);

    const prev = prevById.get(id);
    if (!prev && project.score >= 90) {
      events.push({
        id: `evt:${id}:new_hot:${Date.now()}`,
        projectId: id,
        type: "new_hot",
        title: "New hot opportunity",
        body: `${project.address} scored ${project.score}`,
        createdAt: new Date().toISOString(),
      });
    } else if (prev && prev.phase !== project.phase) {
      events.push({
        id: `evt:${id}:phase:${Date.now()}`,
        projectId: id,
        type: "phase_change",
        title: "Moved into new phase",
        body: `${project.address}: ${prev.phase} → ${project.phase}`,
        createdAt: new Date().toISOString(),
      });
    } else if (prev && project.score - prev.score >= 10) {
      events.push({
        id: `evt:${id}:score:${Date.now()}`,
        projectId: id,
        type: "score_jump",
        title: "Score jumped",
        body: `${project.address}: ${prev.score} → ${project.score}`,
        createdAt: new Date().toISOString(),
      });
    } else if (!prev?.gcName && project.gcName) {
      events.push({
        id: `evt:${id}:gc:${Date.now()}`,
        projectId: id,
        type: "gc_identified",
        title: "GC identified",
        body: `${project.gcName} linked to ${project.address}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Supplement with legacy filings when DOB NOW coverage is thin
  for (const f of bundle.legacy) {
    const lat = Number(f.gis_latitude);
    const lng = Number(f.gis_longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const job = f.job__ || `${f.bin__}-legacy`;
    const bin = f.bin__ ?? null;
    const id = projectId(bin, job);
    if (seen.has(id)) continue;
    seen.add(id);

    const phaseInfo = detectPhase({
      workTypes: [],
      jobType: f.job_type,
      hasSignPermit: bin ? signBins.has(bin) : false,
    });
    const lastActivityAt =
      f.latest_action_date || f.pre__filing_date || new Date().toISOString();
    const architectName = name(
      f.applicant_s_first_name,
      f.applicant_s_last_name,
    );
    const scoringInput = {
      phase: phaseInfo.phase,
      lastActivityAt,
      estimatedJobCost: num(f.initial_cost),
      occupancy: null,
      buildingType: null,
      gcName: null,
      architectName,
      hasSignPermit: bin ? signBins.has(bin) : false,
      jobType: f.job_type ?? null,
    };
    const scored = scoreProject(scoringInput);
    const tradeScores = scoreAllTrades(scoringInput);

    projects.push({
      id,
      city: "nyc",
      bin,
      jobNumber: job,
      address: [f.house__, f.street_name].filter(Boolean).join(" ") || "Unknown",
      borough: f.borough ?? null,
      zip: null,
      latitude: lat,
      longitude: lng,
      jobType: f.job_type ?? null,
      buildingType: null,
      occupancy: null,
      description: f.job_description ?? null,
      estimatedJobCost: num(f.initial_cost),
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      score: scored.score,
      scoreReasons: [...phaseInfo.reasons, ...scored.scoreReasons],
      tradeScores,
      estValueLow: scored.estValueLow,
      estValueHigh: scored.estValueHigh,
      buyingWindowEstimate: scored.buyingWindowEstimate,
      gcName: null,
      architectName,
      architectFirm: null,
      architectPhone: null,
      architectEmail: null,
      architectWebsite: null,
      engineerName: null,
      engineerFirm: null,
      engineerPhone: null,
      engineerEmail: null,
      engineerWebsite: null,
      ownerName: f.owner_s_business_name ?? null,
      hasSignPermit: bin ? signBins.has(bin) : false,
      lastActivityAt,
      filingDate: f.pre__filing_date ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  projects.sort((a, b) => b.score - a.score);
  return { projects, events };
}

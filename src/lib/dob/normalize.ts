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
import { appendDiscards, type DiscardRecord } from "./discards";

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
  architectLicense: null as string | null,
  engineerName: null as string | null,
  engineerFirm: null as string | null,
  engineerPhone: null as string | null,
  engineerEmail: null as string | null,
  engineerWebsite: null as string | null,
  engineerLicense: null as string | null,
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
  license?: string | null;
}) {
  const person = name(opts.firstName, opts.lastName);
  const firm = opts.businessName?.trim() || null;
  const title = opts.title ?? "";
  const phone = opts.phone?.trim() || null;
  const email = opts.email?.trim() || null;
  const website = opts.website?.trim() || null;
  const license = opts.license?.trim() || null;
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
      engineerLicense: license,
    };
  }

  const architectName =
    isArchitect || !isEngineer ? person || firm : null;

  return {
    architectName,
    ...NULL_CONTACTS,
    architectFirm: firm,
    architectPhone: phone,
    architectEmail: email,
    architectWebsite: website,
    architectLicense: license,
  };
}

export type NormalizeBundle = {
  filings: DobNowFiling[];
  permits: DobPermitIssuance[];
  approved: DobApprovedPermit[];
  cos: DobCO[];
  legacy: LegacyFiling[];
};

type LatLng = { lat: number; lng: number };

function parseCoords(latRaw?: string | null, lngRaw?: string | null): LatLng | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 1 || Math.abs(lng) < 1) return null;
  return { lat, lng };
}

export async function normalizeProjects(
  bundle: NormalizeBundle,
  previous: Project[] = [],
): Promise<{ projects: Project[]; events: ProjectEvent[]; discarded: number }> {
  const prevById = new Map(previous.map((p) => [p.id, p]));
  const coBins = new Set(
    bundle.cos.map((c) => c.bin).filter(Boolean) as string[],
  );
  const signBins = new Set<string>();
  const gcByBin = new Map<string, string>();
  const workByKey = new Map<string, string[]>();
  /** BIN → lat/lng enrichment from any dataset that has coords. */
  const coordsByBin = new Map<string, LatLng>();
  const discards: DiscardRecord[] = [];
  const now = new Date().toISOString();

  const rememberCoords = (bin: string | null | undefined, c: LatLng | null) => {
    if (bin && c && !coordsByBin.has(bin)) coordsByBin.set(bin, c);
  };

  for (const p of bundle.permits) {
    const bin = p.bin__ ?? null;
    rememberCoords(bin, parseCoords(p.gis_latitude, p.gis_longitude));
    if (bin && /SG|SIGN/i.test(`${p.work_type ?? ""} ${p.permit_type ?? ""}`)) {
      signBins.add(bin);
    }
    if (bin && p.permittee_s_business_name) {
      gcByBin.set(bin, p.permittee_s_business_name);
    }
  }
  for (const a of bundle.approved) {
    const bin = a.bin ?? null;
    rememberCoords(bin, parseCoords(a.latitude, a.longitude));
    if (bin && /SG|SIGN/i.test(a.work_type ?? "")) signBins.add(bin);
    if (bin && a.work_type) {
      workByKey.set(bin, [...(workByKey.get(bin) ?? []), a.work_type]);
    }
    const gc =
      a.applicant_business_name || a.filing_representative_business_name;
    if (bin && gc && !gcByBin.has(bin)) {
      gcByBin.set(bin, gc);
    }
  }
  for (const c of bundle.cos) {
    rememberCoords(c.bin, parseCoords(c.latitude, c.longitude));
  }
  for (const f of bundle.filings) {
    rememberCoords(f.bin, parseCoords(f.latitude, f.longitude));
  }
  for (const f of bundle.legacy) {
    rememberCoords(f.bin__, parseCoords(f.gis_latitude, f.gis_longitude));
  }

  const projects: Project[] = [];
  const events: ProjectEvent[] = [];
  const seen = new Set<string>();

  const pushScoredProject = (partial: Omit<
    Project,
    | "score"
    | "scoreConfidence"
    | "scoreReasons"
    | "tradeScores"
    | "estValueLow"
    | "estValueHigh"
    | "buyingWindowEstimate"
    | "phaseConfidence"
  > & {
    phaseConfidence: number;
    phaseReasons: string[];
  }) => {
    const scoringInput = {
      phase: partial.phase,
      lastActivityAt: partial.lastActivityAt,
      estimatedJobCost: partial.estimatedJobCost,
      occupancy: partial.occupancy,
      buildingType: partial.buildingType,
      gcName: partial.gcName,
      architectName: partial.architectName,
      hasSignPermit: partial.hasSignPermit,
      jobType: partial.jobType,
    };
    const scored = scoreProject(scoringInput);
    const tradeScores = scoreAllTrades(scoringInput);
    const project: Project = {
      ...partial,
      score: scored.score,
      scoreConfidence: scored.scoreConfidence,
      scoreReasons: [...partial.phaseReasons, ...scored.scoreReasons],
      tradeScores,
      estValueLow: scored.estValueLow,
      estValueHigh: scored.estValueHigh,
      buyingWindowEstimate: scored.buyingWindowEstimate,
      phaseConfidence: partial.phaseConfidence,
    };
    projects.push(project);

    const prev = prevById.get(project.id);
    if (!prev && project.score >= 90) {
      events.push({
        id: `evt:${project.id}:new_hot:${Date.now()}`,
        projectId: project.id,
        type: "new_hot",
        title: "New hot opportunity",
        body: `${project.address} scored ${project.score}`,
        createdAt: now,
      });
    } else if (prev && prev.phase !== project.phase) {
      events.push({
        id: `evt:${project.id}:phase:${Date.now()}`,
        projectId: project.id,
        type: "phase_change",
        title: "Moved into new phase",
        body: `${project.address}: ${prev.phase} → ${project.phase}`,
        createdAt: now,
      });
    } else if (prev && project.score - prev.score >= 10) {
      events.push({
        id: `evt:${project.id}:score:${Date.now()}`,
        projectId: project.id,
        type: "score_jump",
        title: "Score jumped",
        body: `${project.address}: ${prev.score} → ${project.score}`,
        createdAt: now,
      });
    } else if (!prev?.gcName && project.gcName) {
      events.push({
        id: `evt:${project.id}:gc:${Date.now()}`,
        projectId: project.id,
        type: "gc_identified",
        title: "GC identified",
        body: `${project.gcName} linked to ${project.address}`,
        createdAt: now,
      });
    }
  };

  // —— DOB NOW filings (primary early-stage source) ——
  for (const f of bundle.filings) {
    const job = f.job_filing_number || `${f.bin}-${f.filing_date}`;
    const bin = f.bin ?? null;
    const address =
      [f.house_no, f.street_name].filter(Boolean).join(" ") || null;

    if (!job) {
      discards.push({
        at: now,
        dataset: "w9ak-ipjd",
        reason: "missing_job_key",
        jobKey: null,
        bin,
        address,
      });
      continue;
    }

    const id = projectId(bin, job);
    if (seen.has(id)) {
      discards.push({
        at: now,
        dataset: "w9ak-ipjd",
        reason: "duplicate_id",
        jobKey: job,
        bin,
        address,
      });
      continue;
    }

    let coords = parseCoords(f.latitude, f.longitude);
    if (!coords && bin) coords = coordsByBin.get(bin) ?? null;
    if (!coords) {
      discards.push({
        at: now,
        dataset: "w9ak-ipjd",
        reason: "missing_lat_long",
        jobKey: job,
        bin,
        address,
        detail: "No lat/lng on filing and no BIN enrichment match",
      });
      continue;
    }
    if (!address) {
      discards.push({
        at: now,
        dataset: "w9ak-ipjd",
        reason: "failed_address_parse",
        jobKey: job,
        bin,
        address: null,
      });
      continue;
    }

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
      now;

    pushScoredProject({
      id,
      city: "nyc",
      bin,
      jobNumber: job,
      address,
      borough: f.borough ?? null,
      zip: f.postcode ?? null,
      latitude: coords.lat,
      longitude: coords.lng,
      jobType: f.job_type ?? null,
      buildingType: f.building_type ?? null,
      occupancy: f.building_type ?? null,
      description: f.job_description ?? null,
      estimatedJobCost: num(f.initial_cost),
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      phaseReasons: phaseInfo.reasons,
      gcName,
      architectName: contacts.architectName,
      architectFirm: contacts.architectFirm,
      architectPhone: contacts.architectPhone,
      architectEmail: contacts.architectEmail,
      architectWebsite: contacts.architectWebsite,
      architectLicense: contacts.architectLicense,
      engineerName: contacts.engineerName,
      engineerFirm: contacts.engineerFirm,
      engineerPhone: contacts.engineerPhone,
      engineerEmail: contacts.engineerEmail,
      engineerWebsite: contacts.engineerWebsite,
      engineerLicense: contacts.engineerLicense,
      ownerName:
        f.owner_s_business_name ||
        name(f.owner_first_name, f.owner_last_name),
      filerName: name(f.applicant_first_name, f.applicant_last_name),
      filerFirm: f.filing_representative_business_name ?? null,
      hasSignPermit: hasSign,
      lastActivityAt,
      filingDate: f.filing_date ?? null,
      sourceDataset: "w9ak-ipjd",
      updatedAt: now,
    });
  }

  // —— Approved permits not already covered by a filing (early/active jobs) ——
  for (const a of bundle.approved) {
    const job = a.job_filing_number;
    const bin = a.bin ?? null;
    const address =
      [a.house_no, a.street_name].filter(Boolean).join(" ") || null;
    if (!job) {
      discards.push({
        at: now,
        dataset: "rbx6-tga4",
        reason: "missing_job_key",
        jobKey: null,
        bin,
        address,
      });
      continue;
    }
    const id = projectId(bin, job);
    if (seen.has(id)) continue;

    let coords = parseCoords(a.latitude, a.longitude);
    if (!coords && bin) coords = coordsByBin.get(bin) ?? null;
    if (!coords) {
      discards.push({
        at: now,
        dataset: "rbx6-tga4",
        reason: "missing_lat_long",
        jobKey: job,
        bin,
        address,
      });
      continue;
    }
    if (!address) {
      discards.push({
        at: now,
        dataset: "rbx6-tga4",
        reason: "failed_address_parse",
        jobKey: job,
        bin,
        address: null,
      });
      continue;
    }

    seen.add(id);
    const workTypes = [
      ...(a.work_type ? [a.work_type] : []),
      ...(bin ? workByKey.get(bin) ?? [] : []),
    ];
    const hasSign =
      /SG|SIGN/i.test(a.work_type ?? "") || (bin ? signBins.has(bin) : false);
    const phaseInfo = detectPhase({
      workTypes,
      hasCO: bin ? coBins.has(bin) : false,
      hasSignPermit: hasSign,
      foundation: /FO|FOUND|STRUCT/i.test(a.work_type ?? ""),
      mep: /PL|MH|EL|SP|FA|MECH|PLUMB|ELECT/i.test(a.work_type ?? ""),
    });
    const gcName =
      (bin ? gcByBin.get(bin) : null) ||
      a.applicant_business_name ||
      a.filing_representative_business_name ||
      null;

    pushScoredProject({
      id,
      city: "nyc",
      bin,
      jobNumber: job,
      address,
      borough: a.borough ?? null,
      zip: a.postcode || a.zip_code || null,
      latitude: coords.lat,
      longitude: coords.lng,
      jobType: a.work_type ?? null,
      buildingType: null,
      occupancy: null,
      description: a.permit_status
        ? `Approved permit · ${a.permit_status}`
        : "Approved permit",
      estimatedJobCost: num(a.estimated_job_costs),
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      phaseReasons: phaseInfo.reasons,
      gcName,
      architectName: null,
      architectFirm: null,
      architectPhone: null,
      architectEmail: null,
      architectWebsite: null,
      architectLicense: null,
      engineerName: null,
      engineerFirm: null,
      engineerPhone: null,
      engineerEmail: null,
      engineerWebsite: null,
      engineerLicense: null,
      ownerName: a.owner_business_name ?? null,
      filerName: null,
      filerFirm: a.filing_representative_business_name ?? null,
      hasSignPermit: hasSign,
      lastActivityAt: a.issued_date || now,
      filingDate: a.issued_date ?? null,
      sourceDataset: "rbx6-tga4",
      updatedAt: now,
    });
  }

  // —— Legacy filings when DOB NOW coverage is thin ——
  for (const f of bundle.legacy) {
    const job = f.job__ || `${f.bin__}-legacy`;
    const bin = f.bin__ ?? null;
    const address =
      [f.house__, f.street_name].filter(Boolean).join(" ") || null;
    const id = projectId(bin, job);
    if (seen.has(id)) continue;

    let coords = parseCoords(f.gis_latitude, f.gis_longitude);
    if (!coords && bin) coords = coordsByBin.get(bin) ?? null;
    if (!coords) {
      discards.push({
        at: now,
        dataset: "ic3t-wcy2",
        reason: "missing_lat_long",
        jobKey: job,
        bin,
        address,
      });
      continue;
    }

    seen.add(id);
    const phaseInfo = detectPhase({
      workTypes: [],
      jobType: f.job_type,
      hasSignPermit: bin ? signBins.has(bin) : false,
    });
    const lastActivityAt =
      f.latest_action_date || f.pre__filing_date || now;
    const architectName = name(
      f.applicant_s_first_name,
      f.applicant_s_last_name,
    );

    pushScoredProject({
      id,
      city: "nyc",
      bin,
      jobNumber: job,
      address: address || "Unknown",
      borough: f.borough ?? null,
      zip: null,
      latitude: coords.lat,
      longitude: coords.lng,
      jobType: f.job_type ?? null,
      buildingType: null,
      occupancy: null,
      description: f.job_description ?? null,
      estimatedJobCost: num(f.initial_cost),
      phase: phaseInfo.phase,
      phaseConfidence: phaseInfo.confidence,
      phaseReasons: phaseInfo.reasons,
      gcName: null,
      architectName,
      architectFirm: null,
      architectPhone: null,
      architectEmail: null,
      architectWebsite: null,
      architectLicense: null,
      engineerName: null,
      engineerFirm: null,
      engineerPhone: null,
      engineerEmail: null,
      engineerWebsite: null,
      engineerLicense: null,
      ownerName: f.owner_s_business_name ?? null,
      filerName: architectName,
      filerFirm: null,
      hasSignPermit: bin ? signBins.has(bin) : false,
      lastActivityAt,
      filingDate: f.pre__filing_date ?? null,
      sourceDataset: "ic3t-wcy2",
      updatedAt: now,
    });
  }

  await appendDiscards(discards);
  projects.sort((a, b) => b.score - a.score);
  return { projects, events, discarded: discards.length };
}

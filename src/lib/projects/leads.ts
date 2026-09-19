import type { Project } from "@/lib/db/types";

export type ProcurementLead = {
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

function searchLink(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function nysedLicenseUrl(license: string | null | undefined) {
  if (!license) return null;
  return `https://www.op.nysed.gov/verification-search?search_license=${encodeURIComponent(license)}`;
}

function acrisBoroughSearch(address: string, borough: string | null) {
  const boro = (borough || "").toLowerCase();
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

/** Shared lead extraction for project page + map overlay API. */
export function buildProcurementLeads(project: Project): ProcurementLead[] {
  const leads: ProcurementLead[] = [];

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

  return leads;
}

export { searchLink };

export type ContactInfo = {
  ownerName: string | null;
  ownerBusiness: string | null;
  ownerType: string | null;
  applicantName: string | null;
  applicantBusiness: string | null;
  applicantTitle: string | null;
  filingRepName: string | null;
  filingRepBusiness: string | null;
  phone: string | null;
  addressLine: string | null;
};

export type ScoredSite = {
  id: string;
  rank: number;
  address: string;
  borough: string;
  latitude: number;
  longitude: number;
  jobType: string;
  filingStatus: string;
  buildingType: string | null;
  jobDescription: string;
  initialCost: number;
  floorArea: number | null;
  stories: number | null;
  filingDate: string | null;
  firstPermitDate: string | null;
  currentStatusDate: string | null;
  bin: string | null;
  nta: string | null;
  signWork: boolean;
  probabilityScore: number;
  windowLabel: string;
  windowReason: string[];
  contact: ContactInfo;
  source: "nyc-dob-now" | "nyc-dob-jobs";
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  plan: "free" | "pro";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  createdAt: string;
};

export type Top20Response = {
  generatedAt: string;
  count: number;
  boroughFilter: string | null;
  sites: ScoredSite[];
  dataSource: string;
  note?: string;
};

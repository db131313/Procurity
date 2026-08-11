/** City-agnostic project intelligence types. NYC is the first wired city. */

export type CityCode = "nyc";

export type ProjectPhase =
  | "pre_construction"
  | "foundation_structure"
  | "mep"
  | "interior_finishing"
  | "sign_ready"
  | "signage_filed";

export type PipelineStage = "new" | "contacted" | "quoted" | "won" | "lost";

export type PlanTier = "trial" | "starter" | "growth" | "pro";

export type Project = {
  id: string;
  city: CityCode;
  bin: string | null;
  jobNumber: string;
  address: string;
  borough: string | null;
  zip: string | null;
  latitude: number;
  longitude: number;
  jobType: string | null;
  buildingType: string | null;
  occupancy: string | null;
  description: string | null;
  estimatedJobCost: number | null;
  phase: ProjectPhase;
  phaseConfidence: number;
  score: number;
  scoreReasons: string[];
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  gcName: string | null;
  architectName: string | null;
  ownerName: string | null;
  hasSignPermit: boolean;
  lastActivityAt: string;
  filingDate: string | null;
  updatedAt: string;
};

export type PermitRecord = {
  id: string;
  projectId: string;
  sourceDataset: string;
  workType: string | null;
  permitType: string | null;
  status: string | null;
  issuedAt: string | null;
  raw: Record<string, unknown>;
};

export type ProjectEvent = {
  id: string;
  projectId: string;
  type: "new_hot" | "phase_change" | "score_jump" | "gc_identified" | "sign_filed";
  title: string;
  body: string;
  createdAt: string;
};

export type UserRecord = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  plan: PlanTier;
  zipCodes: string[];
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  zipAllowance: number;
  notificationPrefs: {
    email: boolean;
    hotOpportunities: boolean;
    phaseChanges: boolean;
  };
  onboardingComplete: boolean;
  createdAt: string;
};

export type PipelineItem = {
  id: string;
  userId: string;
  projectId: string;
  stage: PipelineStage;
  notes: string | null;
  dealValue: number | null;
  updatedAt: string;
  createdAt: string;
};

export type SubscriptionSnapshot = {
  userId: string;
  plan: PlanTier;
  status: "trialing" | "active" | "canceled" | "past_due" | "none";
  zipAllowance: number;
  currentPeriodEnd: string | null;
};

export const PHASE_LABELS: Record<ProjectPhase, string> = {
  pre_construction: "Pre-Construction / Filed",
  foundation_structure: "Foundation / Structure",
  mep: "MEP (Mechanical / Electrical / Plumbing)",
  interior_finishing: "Interior Finishing",
  sign_ready: "Sign-Ready / Near CO",
  signage_filed: "Signage Filed",
};

export const PLAN_LIMITS: Record<PlanTier, number> = {
  trial: 3,
  starter: 3,
  growth: 10,
  pro: 25,
};

export const PLAN_PRICING = {
  starter: { monthly: 99, annual: 79, zips: 3, name: "Starter" },
  growth: { monthly: 199, annual: 159, zips: 10, name: "Growth" },
  pro: { monthly: 299, annual: 239, zips: 25, name: "Pro" },
} as const;

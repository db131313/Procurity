/** City / region codes for project intelligence. */
export type CityCode =
  | "nyc"
  | "nassau"
  | "westchester"
  | "suffolk"
  | "bergen"
  | "chicago"
  | "los_angeles"
  | "san_francisco"
  | "seattle"
  | "fort_worth"
  | "miami_dade"
  | "miami"
  | "boston"
  | "philadelphia";

export type ProjectPhase =
  | "pre_construction"
  | "foundation_structure"
  | "mep"
  | "interior_finishing"
  | "sign_ready"
  | "signage_filed";

export type PipelineStage = "new" | "contacted" | "quoted" | "won" | "lost";

export type PlanTier = "trial" | "starter" | "growth" | "pro";

export type TradeScores = {
  signage: number;
  lighting: number;
  glass: number;
  security: number;
  flooring: number;
};

/** How many scoring factors had real data (not silently filled). */
export type ScoreConfidence = "high" | "medium" | "low";

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
  scoreConfidence: ScoreConfidence;
  scoreReasons: string[];
  tradeScores: TradeScores;
  estValueLow: number;
  estValueHigh: number;
  buyingWindowEstimate: string;
  gcName: string | null;
  architectName: string | null;
  architectFirm: string | null;
  architectPhone: string | null;
  architectEmail: string | null;
  architectWebsite: string | null;
  architectLicense: string | null;
  engineerName: string | null;
  engineerFirm: string | null;
  engineerPhone: string | null;
  engineerEmail: string | null;
  engineerWebsite: string | null;
  engineerLicense: string | null;
  ownerName: string | null;
  filerName: string | null;
  filerFirm: string | null;
  hasSignPermit: boolean;
  lastActivityAt: string;
  filingDate: string | null;
  sourceDataset: string | null;
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
  /** Stripe-derived (or trial) plan stored in DB. Prefer `effectivePlan()`. */
  plan: PlanTier;
  /**
   * Allowed zip list for map/project filtering (starter / growth / trial).
   * There is no separate `allowedZipCodes` column — `zipCodes` IS the allowlist.
   * Empty list = grandfather unrestricted access until the user picks zips
   * (demo users stay empty + pro = unrestricted).
   */
  /** Admin-only override; when set, takes precedence over `plan`. */
  devPlanOverride: PlanTier | null;
  zipCodes: string[];
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** Cap from PLAN_LIMITS for the user's plan (pro uses a high sentinel). */
  zipAllowance: number;
  notificationPrefs: {
    email: boolean;
    hotOpportunities: boolean;
    phaseChanges: boolean;
  };
  onboardingComplete: boolean;
  createdAt: string;
};

/** Plan used for entitlements: override wins when present. */
export function effectivePlan(user: Pick<UserRecord, "plan" | "devPlanOverride">): PlanTier {
  return user.devPlanOverride ?? user.plan;
}

/** Zip allowance for the effective plan. */
export function effectiveZipAllowance(
  user: Pick<UserRecord, "plan" | "devPlanOverride">,
): number {
  return PLAN_LIMITS[effectivePlan(user)];
}

/** Return a user view with `plan` / `zipAllowance` resolved for the app. */
export function withEffectivePlan(user: UserRecord): UserRecord {
  if (!user.devPlanOverride) return user;
  return {
    ...user,
    plan: user.devPlanOverride,
    zipAllowance: PLAN_LIMITS[user.devPlanOverride],
  };
}

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

/**
 * Zip allowances by plan.
 * Pro is effectively unrestricted ("Full US"); 9999 is a high sentinel for
 * zip pick UI / setUserZips rather than a hard product cap.
 * Trial matches Starter (1 zip).
 */
export const PLAN_LIMITS: Record<PlanTier, number> = {
  trial: 1,
  starter: 1,
  growth: 5,
  pro: 9999,
};

export const PLAN_PRICING = {
  starter: { monthly: 99, annual: 79, zips: 1, name: "Starter" },
  growth: { monthly: 199, annual: 159, zips: 5, name: "Growth" },
  /** zips sentinel matches PLAN_LIMITS.pro; marketing copy uses "Full US". */
  pro: { monthly: 299, annual: 239, zips: 9999, name: "Pro" },
} as const;

/** Marketing / settings label for a plan's zip access. */
export function formatPlanZipAccess(
  tier: PlanTier | keyof typeof PLAN_PRICING,
): string {
  if (tier === "pro") return "Full US";
  const n = PLAN_LIMITS[tier];
  return n === 1 ? "1 zip code" : `${n} zip codes`;
}

/**
 * Whether map/project queries should skip zip filtering for this user.
 * - Pro: Full US (no zip restriction)
 * - Empty zipCodes: grandfather unrestricted until they pick zips
 * - Demo stays unrestricted via empty zipCodes + pro
 */
export function isZipUnrestricted(
  user: Pick<UserRecord, "plan" | "zipCodes">,
): boolean {
  if (user.plan === "pro") return true;
  if (!user.zipCodes.length) return true;
  return false;
}

/**
 * Zip allowlist for server-side map filtering, or undefined when unrestricted.
 * Apply for trial / starter / growth when zipCodes is non-empty.
 */
export function allowedZipFilter(
  user: Pick<UserRecord, "plan" | "zipCodes">,
): string[] | undefined {
  if (isZipUnrestricted(user)) return undefined;
  return user.zipCodes;
}

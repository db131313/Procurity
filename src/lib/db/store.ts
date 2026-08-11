import { promises as fs } from "fs";
import path from "path";
import { DEMO_USER, SEED_EVENTS, SEED_PROJECTS } from "./seed";
import type {
  PipelineItem,
  PipelineStage,
  PlanTier,
  Project,
  ProjectEvent,
  UserRecord,
} from "./types";
import { PLAN_LIMITS } from "./types";

type DbShape = {
  projects: Project[];
  events: ProjectEvent[];
  users: UserRecord[];
  pipeline: PipelineItem[];
  lastSyncAt: string | null;
};

const DATA_PATH = path.join(process.cwd(), "data", "store.json");

async function ensureDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as DbShape;
  } catch {
    const initial: DbShape = {
      projects: SEED_PROJECTS,
      events: SEED_EVENTS,
      users: [DEMO_USER],
      pipeline: [],
      lastSyncAt: null,
    };
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

async function save(db: DbShape) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(db, null, 2));
}

export async function listProjects(opts?: {
  zipCodes?: string[];
  minScore?: number;
  filter?: "all" | "hot" | "buying" | "new";
}): Promise<Project[]> {
  const db = await ensureDb();
  let items = [...db.projects];
  if (opts?.zipCodes?.length) {
    items = items.filter((p) => p.zip && opts.zipCodes!.includes(p.zip));
  }
  if (opts?.minScore) items = items.filter((p) => p.score >= opts.minScore!);
  if (opts?.filter === "hot") items = items.filter((p) => p.score >= 85);
  if (opts?.filter === "buying") {
    items = items.filter(
      (p) =>
        p.phase === "interior_finishing" ||
        p.phase === "sign_ready" ||
        p.score >= 80,
    );
  }
  if (opts?.filter === "new") {
    const week = Date.now() - 7 * 86400000;
    items = items.filter((p) => new Date(p.updatedAt).getTime() >= week);
  }
  return items.sort((a, b) => b.score - a.score);
}

export async function getProject(id: string) {
  const db = await ensureDb();
  return db.projects.find((p) => p.id === id) ?? null;
}

export async function replaceProjects(projects: Project[], events: ProjectEvent[]) {
  const db = await ensureDb();
  db.projects = projects.length ? projects : db.projects;
  db.events = [...events, ...db.events].slice(0, 200);
  db.lastSyncAt = new Date().toISOString();
  await save(db);
  return db;
}

export async function listEvents() {
  const db = await ensureDb();
  return [...db.events].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export async function getUserByFirebaseUid(uid: string) {
  const db = await ensureDb();
  return db.users.find((u) => u.firebaseUid === uid) ?? null;
}

export async function getUserByEmail(email: string) {
  const db = await ensureDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getDemoUser() {
  const db = await ensureDb();
  return db.users.find((u) => u.email === DEMO_USER.email) ?? DEMO_USER;
}

export async function upsertUser(
  partial: Partial<UserRecord> & { firebaseUid: string; email: string },
) {
  const db = await ensureDb();
  const existing = db.users.find(
    (u) =>
      u.firebaseUid === partial.firebaseUid ||
      u.email.toLowerCase() === partial.email.toLowerCase(),
  );
  if (existing) {
    Object.assign(existing, partial, { updatedAt: new Date().toISOString() });
    await save(db);
    return existing;
  }
  const user: UserRecord = {
    id: `user-${Date.now()}`,
    firebaseUid: partial.firebaseUid,
    email: partial.email,
    name: partial.name ?? null,
    plan: partial.plan ?? "trial",
    zipCodes: partial.zipCodes ?? [],
    trialEndsAt:
      partial.trialEndsAt ??
      new Date(Date.now() + 7 * 86400000).toISOString(),
    stripeCustomerId: partial.stripeCustomerId ?? null,
    stripeSubscriptionId: partial.stripeSubscriptionId ?? null,
    zipAllowance: partial.zipAllowance ?? PLAN_LIMITS.trial,
    notificationPrefs: partial.notificationPrefs ?? {
      email: true,
      hotOpportunities: true,
      phaseChanges: true,
    },
    onboardingComplete: partial.onboardingComplete ?? false,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await save(db);
  return user;
}

export async function updateUserPlan(
  userId: string,
  plan: PlanTier,
  stripe?: { customerId?: string; subscriptionId?: string | null },
) {
  const db = await ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  user.plan = plan;
  user.zipAllowance = PLAN_LIMITS[plan];
  if (stripe?.customerId) user.stripeCustomerId = stripe.customerId;
  if (stripe && "subscriptionId" in stripe) {
    user.stripeSubscriptionId = stripe.subscriptionId ?? null;
  }
  await save(db);
  return user;
}

export async function setUserZips(userId: string, zipCodes: string[]) {
  const db = await ensureDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { ok: false as const, reason: "not_found" as const };
  if (zipCodes.length > user.zipAllowance) {
    return {
      ok: false as const,
      reason: "limit" as const,
      allowance: user.zipAllowance,
    };
  }
  user.zipCodes = zipCodes;
  user.onboardingComplete = true;
  await save(db);
  return { ok: true as const, user };
}

export async function listPipeline(userId: string) {
  const db = await ensureDb();
  return db.pipeline.filter((p) => p.userId === userId);
}

export async function addToPipeline(userId: string, projectId: string) {
  const db = await ensureDb();
  const existing = db.pipeline.find(
    (p) => p.userId === userId && p.projectId === projectId,
  );
  if (existing) return existing;
  const item: PipelineItem = {
    id: `pipe-${Date.now()}`,
    userId,
    projectId,
    stage: "new",
    notes: null,
    dealValue: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.pipeline.push(item);
  await save(db);
  return item;
}

export async function movePipelineItem(
  itemId: string,
  stage: PipelineStage,
  dealValue?: number | null,
) {
  const db = await ensureDb();
  const item = db.pipeline.find((p) => p.id === itemId);
  if (!item) return null;
  item.stage = stage;
  item.updatedAt = new Date().toISOString();
  if (dealValue !== undefined) item.dealValue = dealValue;
  await save(db);
  return item;
}

export async function getSyncMeta() {
  const db = await ensureDb();
  return { lastSyncAt: db.lastSyncAt, projectCount: db.projects.length };
}

/** Expand demo accounts to cover the densest live zip codes after a sync. */
export async function expandDemoCoverage(limit = 25) {
  const db = await ensureDb();
  const counts = new Map<string, number>();
  for (const p of db.projects) {
    if (!p.zip) continue;
    counts.set(p.zip, (counts.get(p.zip) ?? 0) + 1);
  }
  const topZips = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([z]) => z);
  if (!topZips.length) return db;

  for (const user of db.users) {
    user.zipCodes = topZips.slice(0, Math.max(user.zipAllowance, 25));
    user.zipAllowance = Math.max(user.zipAllowance, 25);
    if (user.email === DEMO_USER.email || user.plan === "trial") {
      user.plan = user.plan === "trial" ? "pro" : user.plan;
    }
  }
  await save(db);
  return db;
}

/**
 * Citywide demo mode: empty zip list = no filter in listProjects,
 * so Manhattan / Brooklyn / Queens / Bronx / Staten Island all show.
 */
export async function enableCitywideDemo() {
  const db = await ensureDb();
  for (const user of db.users) {
    user.zipCodes = [];
    user.zipAllowance = Math.max(user.zipAllowance, 25);
    user.onboardingComplete = true;
    if (user.plan === "trial") user.plan = "pro";
  }
  await save(db);
  return db;
}

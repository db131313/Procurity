/**
 * Postgres-backed store (Prisma). Active when DATABASE_URL is set.
 * Same public surface as file-store.ts.
 */

import { getPrisma } from "./prisma";
import { DEMO_USER } from "./seed";
import type {
  CityCode,
  PipelineItem,
  PipelineStage,
  PlanTier,
  Project,
  ProjectEvent,
  ScoreConfidence,
  TradeScores,
  UserRecord,
} from "./types";
import { PLAN_LIMITS } from "./types";
import type {
  PlanTier as PrismaPlan,
  ProjectPhase as PrismaPhase,
  PipelineStage as PrismaPipe,
  Project as PrismaProject,
  User as PrismaUser,
  ProjectEvent as PrismaEvent,
  PipelineItem as PrismaPipeItem,
} from "@prisma/client";

function toIso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

function asTradeScores(raw: unknown, fallbackScore = 0): TradeScores {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, number>;
    return {
      signage: o.signage ?? fallbackScore,
      lighting: o.lighting ?? fallbackScore,
      glass: o.glass ?? fallbackScore,
      security: o.security ?? fallbackScore,
      flooring: o.flooring ?? fallbackScore,
    };
  }
  return {
    signage: fallbackScore,
    lighting: fallbackScore,
    glass: fallbackScore,
    security: fallbackScore,
    flooring: fallbackScore,
  };
}

function asNotificationPrefs(raw: unknown): UserRecord["notificationPrefs"] {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, boolean>;
    return {
      email: o.email ?? true,
      hotOpportunities: o.hotOpportunities ?? true,
      phaseChanges: o.phaseChanges ?? true,
    };
  }
  return { email: true, hotOpportunities: true, phaseChanges: true };
}

function mapProject(p: PrismaProject): Project {
  return {
    id: p.id,
    city: p.city as CityCode,
    bin: p.bin,
    jobNumber: p.jobNumber,
    address: p.address,
    borough: p.borough,
    zip: p.zip,
    latitude: p.latitude,
    longitude: p.longitude,
    jobType: p.jobType,
    buildingType: p.buildingType,
    occupancy: p.occupancy,
    description: p.description,
    estimatedJobCost: p.estimatedJobCost,
    phase: p.phase,
    phaseConfidence: p.phaseConfidence,
    score: p.score,
    scoreConfidence: (p.scoreConfidence as ScoreConfidence) || "medium",
    scoreReasons: p.scoreReasons ?? [],
    tradeScores: asTradeScores(p.tradeScores, p.score),
    estValueLow: p.estValueLow,
    estValueHigh: p.estValueHigh,
    buyingWindowEstimate: p.buyingWindowEstimate,
    gcName: p.gcName,
    architectName: p.architectName,
    architectFirm: p.architectFirm,
    architectPhone: p.architectPhone,
    architectEmail: p.architectEmail,
    architectWebsite: p.architectWebsite,
    architectLicense: p.architectLicense,
    engineerName: p.engineerName,
    engineerFirm: p.engineerFirm,
    engineerPhone: p.engineerPhone,
    engineerEmail: p.engineerEmail,
    engineerWebsite: p.engineerWebsite,
    engineerLicense: p.engineerLicense,
    ownerName: p.ownerName,
    filerName: p.filerName,
    filerFirm: p.filerFirm,
    hasSignPermit: p.hasSignPermit,
    lastActivityAt: toIso(p.lastActivityAt)!,
    filingDate: toIso(p.filingDate),
    sourceDataset: p.sourceDataset,
    updatedAt: toIso(p.updatedAt)!,
  };
}

function mapUser(u: PrismaUser): UserRecord {
  return {
    id: u.id,
    firebaseUid: u.firebaseUid,
    email: u.email,
    name: u.name,
    plan: u.plan,
    zipCodes: u.zipCodes ?? [],
    trialEndsAt: toIso(u.trialEndsAt),
    stripeCustomerId: u.stripeCustomerId,
    stripeSubscriptionId: u.stripeSubscriptionId,
    zipAllowance: u.zipAllowance,
    notificationPrefs: asNotificationPrefs(u.notificationPrefs),
    onboardingComplete: u.onboardingComplete,
    createdAt: toIso(u.createdAt)!,
  };
}

function mapEvent(e: PrismaEvent): ProjectEvent {
  return {
    id: e.id,
    projectId: e.projectId,
    type: e.type as ProjectEvent["type"],
    title: e.title,
    body: e.body,
    createdAt: toIso(e.createdAt)!,
  };
}

function mapPipeline(p: PrismaPipeItem): PipelineItem {
  return {
    id: p.id,
    userId: p.userId,
    projectId: p.projectId,
    stage: p.stage,
    notes: p.notes,
    dealValue: p.dealValue,
    createdAt: toIso(p.createdAt)!,
    updatedAt: toIso(p.updatedAt)!,
  };
}

function projectToPrisma(p: Project) {
  return {
    id: p.id,
    city: p.city,
    bin: p.bin,
    jobNumber: p.jobNumber,
    address: p.address,
    borough: p.borough,
    zip: p.zip,
    latitude: p.latitude,
    longitude: p.longitude,
    jobType: p.jobType,
    buildingType: p.buildingType,
    occupancy: p.occupancy,
    description: p.description,
    estimatedJobCost: p.estimatedJobCost,
    phase: p.phase as PrismaPhase,
    phaseConfidence: p.phaseConfidence,
    score: p.score,
    scoreConfidence: p.scoreConfidence,
    scoreReasons: p.scoreReasons,
    tradeScores: p.tradeScores,
    estValueLow: p.estValueLow,
    estValueHigh: p.estValueHigh,
    buyingWindowEstimate: p.buyingWindowEstimate,
    gcName: p.gcName,
    architectName: p.architectName,
    architectFirm: p.architectFirm,
    architectPhone: p.architectPhone,
    architectEmail: p.architectEmail,
    architectWebsite: p.architectWebsite,
    architectLicense: p.architectLicense,
    engineerName: p.engineerName,
    engineerFirm: p.engineerFirm,
    engineerPhone: p.engineerPhone,
    engineerEmail: p.engineerEmail,
    engineerWebsite: p.engineerWebsite,
    engineerLicense: p.engineerLicense,
    ownerName: p.ownerName,
    filerName: p.filerName,
    filerFirm: p.filerFirm,
    hasSignPermit: p.hasSignPermit,
    lastActivityAt: new Date(p.lastActivityAt),
    filingDate: p.filingDate ? new Date(p.filingDate) : null,
    sourceDataset: p.sourceDataset,
  };
}

export async function listProjects(opts?: {
  zipCodes?: string[];
  minScore?: number;
  filter?: "all" | "hot" | "buying" | "new";
  city?: string;
}): Promise<Project[]> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (opts?.city) where.city = opts.city;
  if (opts?.zipCodes?.length) where.zip = { in: opts.zipCodes };
  if (opts?.minScore) where.score = { gte: opts.minScore };
  if (opts?.filter === "hot") where.score = { gte: 85 };
  if (opts?.filter === "buying") {
    where.OR = [
      { phase: { in: ["interior_finishing", "sign_ready"] } },
      { score: { gte: 80 } },
    ];
  }
  if (opts?.filter === "new") {
    where.updatedAt = { gte: new Date(Date.now() - 7 * 86400000) };
  }
  const rows = await prisma.project.findMany({
    where,
    orderBy: { score: "desc" },
  });
  return rows.map(mapProject);
}

export async function getProject(id: string) {
  const row = await getPrisma().project.findUnique({ where: { id } });
  return row ? mapProject(row) : null;
}

export async function replaceProjects(
  projects: Project[],
  events: ProjectEvent[],
  opts?: { cities?: string[] },
) {
  const prisma = getPrisma();
  const cities = [
    ...new Set(
      (opts?.cities?.length ? opts.cities : projects.map((p) => p.city)).map(
        String,
      ),
    ),
  ];

  await prisma.$transaction(async (tx) => {
    if (cities.length && projects.length) {
      await tx.project.deleteMany({ where: { city: { in: cities } } });
      // Create in chunks to stay under param limits
      const chunk = 100;
      for (let i = 0; i < projects.length; i += chunk) {
        const slice = projects.slice(i, i + chunk);
        await tx.project.createMany({
          data: slice.map(projectToPrisma),
          skipDuplicates: true,
        });
      }
    }
    if (events.length) {
      await tx.projectEvent.createMany({
        data: events.slice(0, 200).map((e) => ({
          id: e.id,
          projectId: e.projectId,
          type: e.type,
          title: e.title,
          body: e.body,
          createdAt: new Date(e.createdAt),
        })),
        skipDuplicates: true,
      });
    }
    const projectCount = await tx.project.count();
    await tx.syncMeta.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        lastSyncAt: new Date(),
        projectCount,
      },
      update: { lastSyncAt: new Date(), projectCount },
    });
  });

  const meta = await getSyncMeta();
  const all = await listProjects();
  return {
    projects: all,
    events: await listEvents(),
    users: [],
    pipeline: [],
    lastSyncAt: meta.lastSyncAt,
  };
}

export async function listEvents() {
  const rows = await getPrisma().projectEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapEvent);
}

export async function getUserByFirebaseUid(uid: string) {
  const row = await getPrisma().user.findUnique({ where: { firebaseUid: uid } });
  return row ? mapUser(row) : null;
}

export async function getUserByEmail(email: string) {
  const row = await getPrisma().user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return row ? mapUser(row) : null;
}

export async function getUserByStripeCustomerId(customerId: string) {
  const row = await getPrisma().user.findFirst({
    where: { stripeCustomerId: customerId },
  });
  return row ? mapUser(row) : null;
}

export async function getDemoUser() {
  const existing = await getUserByEmail(DEMO_USER.email);
  if (existing) return existing;
  return upsertUser({
    firebaseUid: DEMO_USER.firebaseUid,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    plan: "pro",
    onboardingComplete: true,
    zipCodes: [],
    zipAllowance: 25,
  });
}

export async function upsertUser(
  partial: Partial<UserRecord> & { firebaseUid: string; email: string },
) {
  const prisma = getPrisma();
  const email = partial.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ firebaseUid: partial.firebaseUid }, { email }],
    },
  });

  const data = {
    firebaseUid: partial.firebaseUid,
    email,
    name: partial.name ?? existing?.name ?? null,
    plan: (partial.plan ?? existing?.plan ?? "trial") as PrismaPlan,
    zipCodes: partial.zipCodes ?? existing?.zipCodes ?? [],
    trialEndsAt: partial.trialEndsAt
      ? new Date(partial.trialEndsAt)
      : existing?.trialEndsAt ??
        new Date(Date.now() + 7 * 86400000),
    stripeCustomerId:
      partial.stripeCustomerId !== undefined
        ? partial.stripeCustomerId
        : existing?.stripeCustomerId ?? null,
    stripeSubscriptionId:
      partial.stripeSubscriptionId !== undefined
        ? partial.stripeSubscriptionId
        : existing?.stripeSubscriptionId ?? null,
    zipAllowance:
      partial.zipAllowance ??
      existing?.zipAllowance ??
      PLAN_LIMITS[partial.plan ?? existing?.plan ?? "trial"],
    notificationPrefs:
      partial.notificationPrefs ??
      existing?.notificationPrefs ??
      { email: true, hotOpportunities: true, phaseChanges: true },
    onboardingComplete:
      partial.onboardingComplete ?? existing?.onboardingComplete ?? false,
  };

  const row = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });
  return mapUser(row);
}

export async function updateUserPlan(
  userId: string,
  plan: PlanTier,
  stripe?: { customerId?: string; subscriptionId?: string | null },
) {
  const row = await getPrisma().user.update({
    where: { id: userId },
    data: {
      plan: plan as PrismaPlan,
      zipAllowance: PLAN_LIMITS[plan],
      ...(stripe?.customerId
        ? { stripeCustomerId: stripe.customerId }
        : {}),
      ...(stripe && "subscriptionId" in stripe
        ? { stripeSubscriptionId: stripe.subscriptionId }
        : {}),
    },
  });
  return mapUser(row);
}

export async function setUserZips(userId: string, zipCodes: string[]) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, reason: "not_found" as const };
  if (zipCodes.length > user.zipAllowance) {
    return {
      ok: false as const,
      reason: "limit" as const,
      allowance: user.zipAllowance,
    };
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { zipCodes, onboardingComplete: true },
  });
  return { ok: true as const, user: mapUser(updated) };
}

export async function listPipeline(userId: string) {
  const rows = await getPrisma().pipelineItem.findMany({ where: { userId } });
  return rows.map(mapPipeline);
}

export async function addToPipeline(userId: string, projectId: string) {
  const prisma = getPrisma();
  const existing = await prisma.pipelineItem.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (existing) return mapPipeline(existing);
  const row = await prisma.pipelineItem.create({
    data: { userId, projectId, stage: "new" },
  });
  return mapPipeline(row);
}

export async function movePipelineItem(
  itemId: string,
  stage: PipelineStage,
  dealValue?: number | null,
) {
  const row = await getPrisma().pipelineItem.update({
    where: { id: itemId },
    data: {
      stage: stage as PrismaPipe,
      ...(dealValue !== undefined ? { dealValue } : {}),
    },
  });
  return mapPipeline(row);
}

export async function getSyncMeta() {
  const prisma = getPrisma();
  const meta = await prisma.syncMeta.findUnique({ where: { id: "default" } });
  const projectCount = meta?.projectCount ?? (await prisma.project.count());
  return {
    lastSyncAt: toIso(meta?.lastSyncAt) ?? null,
    projectCount,
  };
}

export async function expandDemoCoverage(limit = 25) {
  const prisma = getPrisma();
  const projects = await prisma.project.findMany({
    where: { zip: { not: null } },
    select: { zip: true },
  });
  const counts = new Map<string, number>();
  for (const p of projects) {
    if (!p.zip) continue;
    counts.set(p.zip, (counts.get(p.zip) ?? 0) + 1);
  }
  const topZips = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([z]) => z);
  if (!topZips.length) return;

  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        zipCodes: topZips.slice(0, Math.max(user.zipAllowance, 25)),
        zipAllowance: Math.max(user.zipAllowance, 25),
        plan:
          user.email === DEMO_USER.email || user.plan === "trial"
            ? "pro"
            : user.plan,
      },
    });
  }
}

export async function enableCitywideDemo() {
  const prisma = getPrisma();
  await prisma.user.updateMany({
    data: {
      zipCodes: [],
      zipAllowance: 25,
      onboardingComplete: true,
    },
  });
  await prisma.user.updateMany({
    where: { plan: "trial" },
    data: { plan: "pro" },
  });
}

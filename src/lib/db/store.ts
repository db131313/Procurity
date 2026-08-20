/**
 * Data access facade.
 * - No DATABASE_URL → file-backed `data/store.json` (local/demo only)
 * - DATABASE_URL set → Prisma/Postgres (Neon) exclusively
 */

import { isDatabaseConfigured } from "./prisma";
import * as fileStore from "./file-store";
import type {
  PipelineStage,
  PlanTier,
  Project,
  ProjectEvent,
  UserRecord,
} from "./types";

async function backend() {
  if (isDatabaseConfigured()) {
    return import("./prisma-store");
  }
  return fileStore;
}

export async function listProjects(opts?: {
  zipCodes?: string[];
  minScore?: number;
  filter?: "all" | "hot" | "buying" | "new";
  city?: string;
}): Promise<Project[]> {
  const b = await backend();
  return b.listProjects(opts);
}

export async function getProject(id: string) {
  const b = await backend();
  return b.getProject(id);
}

export async function replaceProjects(
  projects: Project[],
  events: ProjectEvent[],
  opts?: { cities?: string[] },
) {
  const b = await backend();
  return b.replaceProjects(projects, events, opts);
}

export async function listEvents() {
  const b = await backend();
  return b.listEvents();
}

export async function getUserByFirebaseUid(uid: string) {
  const b = await backend();
  return b.getUserByFirebaseUid(uid);
}

export async function getUserByEmail(email: string) {
  const b = await backend();
  return b.getUserByEmail(email);
}

export async function getUserByStripeCustomerId(customerId: string) {
  const b = await backend();
  return b.getUserByStripeCustomerId(customerId);
}

export async function getDemoUser() {
  const b = await backend();
  return b.getDemoUser();
}

export async function upsertUser(
  partial: Partial<UserRecord> & { firebaseUid: string; email: string },
) {
  const b = await backend();
  return b.upsertUser(partial);
}

export async function updateUserPlan(
  userId: string,
  plan: PlanTier,
  stripe?: { customerId?: string; subscriptionId?: string | null },
) {
  const b = await backend();
  return b.updateUserPlan(userId, plan, stripe);
}

export async function setUserZips(userId: string, zipCodes: string[]) {
  const b = await backend();
  return b.setUserZips(userId, zipCodes);
}

export async function listPipeline(userId: string) {
  const b = await backend();
  return b.listPipeline(userId);
}

export async function addToPipeline(userId: string, projectId: string) {
  const b = await backend();
  return b.addToPipeline(userId, projectId);
}

export async function movePipelineItem(
  itemId: string,
  stage: PipelineStage,
  dealValue?: number | null,
) {
  const b = await backend();
  return b.movePipelineItem(itemId, stage, dealValue);
}

export async function getSyncMeta() {
  const b = await backend();
  return b.getSyncMeta();
}

export async function expandDemoCoverage(limit = 25) {
  const b = await backend();
  return b.expandDemoCoverage(limit);
}

export async function enableCitywideDemo() {
  const b = await backend();
  return b.enableCitywideDemo();
}

export { isDatabaseConfigured } from "./prisma";

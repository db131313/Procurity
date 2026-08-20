/**
 * Legacy NextAuth credentials user store (`data/users.json`).
 * When DATABASE_URL is set this module does NOT read/write JSON —
 * lookups go through the Prisma-backed `@/lib/db/store` facade.
 * Production auth is Firebase Email/Password (see AuthForm).
 */

import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { UserRecord } from "./types";
import { isDatabaseConfigured } from "@/lib/db/prisma";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

function isServerlessRuntime() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      process.env.VERCEL,
  );
}

let memoryUsers: UserRecord[] | null = null;

const DEMO_USER: UserRecord = {
  id: "usr_demo_procurity",
  name: "Demo Rep",
  email: "demo@procurity.pro",
  // password: demo1234 — local/demo only
  passwordHash:
    "$2b$10$AmmEued3eym2p.R.ARxhrO8mPewkgKRjdl5me8/9GzQ52ELujHtLa",
  plan: "pro",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function ensureStore(): Promise<UserRecord[]> {
  if (isDatabaseConfigured()) {
    throw new Error(
      "data/users.json is disabled when DATABASE_URL is set — use Firebase Auth + db/store",
    );
  }
  if (memoryUsers) return memoryUsers;
  if (isServerlessRuntime()) {
    memoryUsers = [{ ...DEMO_USER }];
    return memoryUsers;
  }
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw) as UserRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      memoryUsers = [{ ...DEMO_USER }];
      try {
        await fs.writeFile(USERS_PATH, JSON.stringify(memoryUsers, null, 2));
      } catch {
        /* read-only */
      }
      return memoryUsers;
    }
    memoryUsers = parsed;
    return parsed;
  } catch {
    memoryUsers = [{ ...DEMO_USER }];
    try {
      await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
      await fs.writeFile(USERS_PATH, JSON.stringify(memoryUsers, null, 2));
    } catch {
      /* read-only */
    }
    return memoryUsers;
  }
}

async function saveUsers(users: UserRecord[]) {
  memoryUsers = users;
  if (isDatabaseConfigured() || isServerlessRuntime()) return;
  try {
    await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
    await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
  } catch {
    /* read-only — keep memory only */
  }
}

export async function findUserByEmail(email: string) {
  if (isDatabaseConfigured()) {
    const { getUserByEmail } = await import("@/lib/db/store");
    const u = await getUserByEmail(email);
    if (!u) return null;
    return {
      id: u.id,
      name: u.name ?? "",
      email: u.email,
      passwordHash: "",
      plan: u.plan === "trial" ? "free" : u.plan,
      stripeCustomerId: u.stripeCustomerId,
      stripeSubscriptionId: u.stripeSubscriptionId,
      createdAt: u.createdAt,
    } as UserRecord;
  }
  const users = await ensureStore();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  if (isDatabaseConfigured()) return null;
  const users = await ensureStore();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  if (isDatabaseConfigured()) {
    throw new Error("Use Firebase signup when DATABASE_URL is configured.");
  }
  const users = await ensureStore();
  const existing = users.find(
    (u) => u.email.toLowerCase() === input.email.toLowerCase(),
  );
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const user: UserRecord = {
    id: `usr_${Date.now().toString(36)}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: await bcrypt.hash(input.password, 10),
    plan: "free",
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

export async function verifyPassword(user: UserRecord, password: string) {
  if (!user.passwordHash) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export async function updateUserPlan(
  email: string,
  patch: Partial<
    Pick<
      UserRecord,
      "plan" | "stripeCustomerId" | "stripeSubscriptionId"
    >
  >,
) {
  if (isDatabaseConfigured()) {
    const { getUserByEmail, updateUserPlan: upd } = await import(
      "@/lib/db/store"
    );
    const u = await getUserByEmail(email);
    if (!u) return null;
    const rawPlan = patch.plan as string | undefined;
    const plan =
      !rawPlan || rawPlan === "free"
        ? "trial"
        : (rawPlan as "starter" | "growth" | "pro" | "trial");
    return upd(u.id, plan, {
      customerId: patch.stripeCustomerId ?? undefined,
      subscriptionId: patch.stripeSubscriptionId,
    });
  }
  const users = await ensureStore();
  const idx = users.findIndex(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...patch };
  await saveUsers(users);
  return users[idx];
}

export async function updateUserByCustomerId(
  customerId: string,
  patch: Partial<
    Pick<
      UserRecord,
      "plan" | "stripeCustomerId" | "stripeSubscriptionId"
    >
  >,
) {
  if (isDatabaseConfigured()) {
    const { getUserByStripeCustomerId, updateUserPlan: upd } = await import(
      "@/lib/db/store"
    );
    const u = await getUserByStripeCustomerId(customerId);
    if (!u) return null;
    const rawPlan = patch.plan as string | undefined;
    const plan =
      !rawPlan || rawPlan === "free"
        ? "trial"
        : (rawPlan as "starter" | "growth" | "pro" | "trial");
    return upd(u.id, plan, {
      customerId: patch.stripeCustomerId ?? customerId,
      subscriptionId: patch.stripeSubscriptionId,
    });
  }
  const users = await ensureStore();
  const idx = users.findIndex((u) => u.stripeCustomerId === customerId);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...patch };
  await saveUsers(users);
  return users[idx];
}

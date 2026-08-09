import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { UserRecord } from "./types";

const USERS_PATH = path.join(process.cwd(), "data", "users.json");

const DEMO_USER: UserRecord = {
  id: "usr_demo_procurity",
  name: "Demo Rep",
  email: "demo@procurity.pro",
  // password: demo1234
  passwordHash:
    "$2b$10$AmmEued3eym2p.R.ARxhrO8mPewkgKRjdl5me8/9GzQ52ELujHtLa",
  plan: "pro",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function ensureStore(): Promise<UserRecord[]> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw) as UserRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await fs.writeFile(USERS_PATH, JSON.stringify([DEMO_USER], null, 2));
      return [DEMO_USER];
    }
    return parsed;
  } catch {
    await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
    await fs.writeFile(USERS_PATH, JSON.stringify([DEMO_USER], null, 2));
    return [DEMO_USER];
  }
}

async function saveUsers(users: UserRecord[]) {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

export async function findUserByEmail(email: string) {
  const users = await ensureStore();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  const users = await ensureStore();
  return users.find((u) => u.id === id) ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
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
  const users = await ensureStore();
  const idx = users.findIndex((u) => u.stripeCustomerId === customerId);
  if (idx < 0) return null;
  users[idx] = { ...users[idx], ...patch };
  await saveUsers(users);
  return users[idx];
}

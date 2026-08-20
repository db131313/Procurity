import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Prisma client — only instantiate when DATABASE_URL is present. */
export function getPrisma(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

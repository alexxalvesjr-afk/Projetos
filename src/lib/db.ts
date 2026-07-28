import { PrismaClient } from "@prisma/client";

/**
 * A single PrismaClient per process. Next's dev server re-evaluates modules on
 * every change, so without this cache each hot reload would open a new pool and
 * eventually exhaust Postgres connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

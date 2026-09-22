import { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────
// Prisma Client Singleton
// ─────────────────────────────────────────────
//
// In development, Next.js hot-reloading creates new module instances.
// Without this pattern, you'd create a new PrismaClient on every hot reload,
// quickly exhausting the database connection pool.
//
// This pattern stores one PrismaClient on the global object in development,
// and creates a single instance for production.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure PostgreSQL.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Lazily created so that importing this module never requires a database (e.g. during `next build`). */
export function getDb(): PrismaClient {
  globalForPrisma.__prisma ??= createClient();
  return globalForPrisma.__prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Arbitrary constant: every ranking mutation takes this transaction-level advisory lock. */
const RANKING_LOCK = 704_211;

/**
 * Runs `fn` in a transaction that holds the global ranking lock, so concurrent
 * claims and payment confirmations are applied one at a time.
 */
export function withRankingLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${RANKING_LOCK})`;
      return fn(tx);
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/**
 * Removes the seeded demo listings and everything paid through the simulated (demo) checkout.
 * Real listings, users, categories and settings are untouched.
 * Usage: npm run db:clear-demo
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  // Seeded sample listings + listings that were only ever paid through the simulated checkout.
  const listings = await db.listing.deleteMany({ where: { OR: [{ isDemo: true }, { AND: [{ payments: { some: {} } }, { payments: { every: { isDemo: true } } }] }] } });
  const payments = await db.payment.deleteMany({ where: { isDemo: true } });
  const snapshots = await db.dailySnapshot.deleteMany({});
  console.log(`Removed ${listings.count} demo listings (with their payments) and ${payments.count} other demo payments. Cleared ${snapshots.count} archive snapshots (rebuilt from real payments on demand).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

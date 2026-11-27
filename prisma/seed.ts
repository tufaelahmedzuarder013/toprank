/**
 * Seeds categories, default settings/content/FAQs, the admin account and
 * (unless SEED_DEMO=false) clearly-flagged demo listings with payment history.
 *
 *   npx prisma db seed          # or: npm run db:seed
 *   SEED_DEMO=false npm run db:seed
 *
 * Safe to run more than once. With SEED_ONLY_IF_EMPTY=true (used by the Vercel build) it only
 * seeds a fresh database; on an initialised one it just makes sure the admin account exists, so
 * deleted categories or removed demo data never come back on later deploys.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { defaultCategories, defaultContentPages, defaultFaqs, defaultSettings } from "../src/config/defaults";
import { hashPassword } from "../src/server/password";
import { buildDemoPayments } from "./demo-data";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  if (process.env.SEED_ONLY_IF_EMPTY === "true" && (await prisma.siteSettings.findUnique({ where: { id: 1 }, select: { id: true } }))) {
    console.log("• Database already initialised — only checking the admin account.");
    await ensureAdmin();
    return;
  }

  // Categories
  for (const [i, c] of defaultCategories.entries()) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: { ...c, sortOrder: i }, update: {} });
  }

  // Settings, pages, FAQs (only when missing — never overwrite admin edits)
  await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, data: defaultSettings as unknown as Prisma.InputJsonValue }, update: {} });
  for (const page of defaultContentPages) {
    await prisma.contentPage.upsert({ where: { slug: page.slug }, create: page, update: {} });
  }
  if ((await prisma.faq.count()) === 0) {
    await prisma.faq.createMany({ data: defaultFaqs.map((f, i) => ({ ...f, sortOrder: i })) });
  }

  await ensureAdmin();

  // Demo listings
  if (process.env.SEED_DEMO === "false") return;
  if ((await prisma.listing.count({ where: { isDemo: true } })) > 0) {
    console.log("• Demo listings already present — skipping.");
    return;
  }
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const now = new Date();
  for (const { listing: l, payments } of buildDemoPayments(now)) {
    const first = payments[0].at;
    const last = payments[payments.length - 1].at;
    const isX = l.kind === "X_PROFILE";
    const created = await prisma.listing.create({
      data: {
        slug: l.slug,
        kind: l.kind ?? "WEBSITE",
        urlKey: isX ? `x:${l.slug}` : l.domain,
        url: isX ? `https://x.com/${l.slug}` : `https://${l.domain}/`,
        domain: l.domain,
        name: l.name,
        description: l.description,
        categoryId: categories.get(l.category)!,
        status: "ACTIVE",
        totalAmount: l.total,
        rankedAt: last,
        clicks: l.clicks,
        isDemo: true,
        confirmedAt: first,
        createdAt: first,
      },
    });
    let running = 0;
    for (const [i, p] of payments.entries()) {
      running += p.amount;
      await prisma.payment.create({
        data: {
          listingId: created.id,
          kind: i === 0 ? "NEW_LISTING" : "UPGRADE",
          amount: p.amount,
          previousTotal: running - p.amount,
          targetTotal: running,
          status: "SUCCEEDED",
          provider: "DEMO",
          providerSessionId: `demo_seed_${created.id}_${i}`,
          isDemo: true,
          confirmedAt: p.at,
          createdAt: p.at,
        },
      });
    }
  }
  console.log("✓ Demo listings and payment history created (all flagged isDemo).");
}

/** Creates (or promotes) the admin from ADMIN_EMAIL / ADMIN_PASSWORD. Never changes an existing password. */
async function ensureAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@toprung.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    if (!adminPassword || adminPassword.length < 10) {
      console.warn("⚠  ADMIN_PASSWORD is missing or shorter than 10 characters — admin account not created.");
    } else {
      await prisma.user.create({ data: { email: adminEmail, name: "Site admin", role: "ADMIN", passwordHash: await hashPassword(adminPassword) } });
      console.log(`✓ Admin account created: ${adminEmail}`);
    }
  } else if (existingAdmin.role !== "ADMIN") {
    await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: "ADMIN" } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

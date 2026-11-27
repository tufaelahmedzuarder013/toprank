import { db } from "@/server/db";
import { defaultCategories } from "@/config/defaults";
import { hashPassword } from "@/server/password";

const TABLES = ["WebhookEvent", "Payment", "OwnershipClaim", "Listing", "Session", "User", "Category", "DailySnapshot", "SiteSettings", "ContentPage", "Faq", "ContactMessage"];

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("test")) throw new Error("Refusing to truncate a database whose URL doesn't contain 'test'. Set TEST_DATABASE_URL.");
  await db.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(", ")} CASCADE`);
  await db.category.createMany({ data: defaultCategories.slice(0, 4).map((c, i) => ({ ...c, sortOrder: i })) });
}

let n = 0;
export async function makeUser(role: "USER" | "ADMIN" = "USER") {
  n += 1;
  return db.user.create({ data: { email: `user${n}-${Date.now()}@test.example`, name: `User ${n}`, passwordHash: await hashPassword("correct horse battery"), role } });
}

export function claim(target: string, amount: number, extra: Partial<{ name: string; category: string; userId: string | null }> = {}) {
  return {
    target,
    amount,
    category: extra.category ?? "ai-tools",
    name: extra.name ?? target.replace(/^@/, "").split(".")[0],
    description: "A test listing",
    logoUrl: null,
    ogImageUrl: null,
    userId: extra.userId ?? null,
  };
}

export const minutes = (base: Date, m: number) => new Date(base.getTime() + m * 60_000);

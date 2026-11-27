import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { siteUrl } from "@/server/payment-provider";
import { getActiveDays } from "@/server/leaderboard";
import { toDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const [categories, listings, days] = await Promise.all([
    db.category.findMany({ where: { enabled: true }, select: { slug: true } }),
    db.listing.findMany({ where: { status: "ACTIVE" }, orderBy: { totalAmount: "desc" }, take: 5000, select: { slug: true, updatedAt: true } }),
    getActiveDays(60),
  ]);
  const today = toDateKey(now);
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/today`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/categories`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/claim`, changeFrequency: "monthly", priority: 0.6 },
    ...["how-it-works", "about", "faq", "rules", "contact", "terms", "privacy"].map((p) => ({ url: `${base}/${p}`, changeFrequency: "monthly" as const, priority: 0.4 })),
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...listings.map((l) => ({ url: `${base}/p/${l.slug}`, lastModified: l.updatedAt, changeFrequency: "daily" as const, priority: 0.5 })),
    ...days.filter((d) => d < today).map((d) => ({ url: `${base}/daily/${d}`, changeFrequency: "never" as const, priority: 0.3 })),
  ];
}

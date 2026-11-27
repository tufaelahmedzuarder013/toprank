import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Tx } from "@/server/db";
import { compareEntries, rankDaily, rankEntries, requiredTotalForRank, type BoardEntry } from "@/lib/ranking";
import { dayWindow, toDateKey, utcDayStart } from "@/lib/time";
import { getSettings } from "@/server/settings";

export const listingCardSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  url: true,
  domain: true,
  kind: true,
  logoUrl: true,
  totalAmount: true,
  clicks: true,
  confirmedAt: true,
  rankedAt: true,
  isDemo: true,
  ownerId: true,
  verifiedAt: true,
  category: { select: { slug: true, name: true, icon: true } },
} satisfies Prisma.ListingSelect;

type CardRow = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

/** Serializable shape passed to leaderboard UI components. */
export type ListingCard = {
  id: string;
  slug: string;
  name: string;
  description: string;
  domain: string;
  kind: "WEBSITE" | "X_PROFILE";
  logoUrl: string | null;
  category: { slug: string; name: string; icon: string };
  totalAmount: number;
  /** Amount that counts on the board being shown (all-time total or the day's spend) */
  amount: number;
  clicks: number;
  addedAt: string | null;
  isDemo: boolean;
  verified: boolean;
  rank: number;
};

const ACTIVE_ORDER: Prisma.ListingOrderByWithRelationInput[] = [{ totalAmount: "desc" }, { rankedAt: "asc" }, { id: "asc" }];

function toCard(row: CardRow, rank: number, amount = row.totalAmount): ListingCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    domain: row.domain,
    kind: row.kind,
    logoUrl: row.logoUrl,
    category: row.category,
    totalAmount: row.totalAmount,
    amount,
    clicks: row.clicks,
    addedAt: row.confirmedAt?.toISOString() ?? null,
    isDemo: row.isDemo,
    verified: Boolean(row.ownerId && row.verifiedAt),
    rank,
  };
}

/** Every active listing's (total, rankedAt) — the input to all ranking maths. */
export async function loadBoardEntries(client: Tx | typeof db, categoryId?: string): Promise<BoardEntry[]> {
  const rows = await client.listing.findMany({
    where: { status: "ACTIVE", ...(categoryId ? { categoryId } : {}) },
    select: { id: true, totalAmount: true, rankedAt: true },
    orderBy: ACTIVE_ORDER,
  });
  return rows.map((r) => ({ id: r.id, total: r.totalAmount, rankedAt: r.rankedAt ?? new Date(0) }));
}

export const getBoardEntries = cache((categoryId?: string) => loadBoardEntries(db, categoryId));

/** All-time board (optionally for one category), paginated. */
export async function getAllTimeBoard({ categoryId, page = 1, pageSize = 25 }: { categoryId?: string; page?: number; pageSize?: number } = {}) {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE", ...(categoryId ? { categoryId } : {}) };
  const skip = (Math.max(1, page) - 1) * pageSize;
  const [count, rows] = await Promise.all([db.listing.count({ where }), db.listing.findMany({ where, orderBy: ACTIVE_ORDER, skip, take: pageSize, select: listingCardSelect })]);
  return { count, page, pageSize, items: rows.map((r, i) => toCard(r, skip + i + 1)) };
}

/** Ranking for one UTC day, computed from confirmed payments made during that day. */
export async function getDailyBoard(dateKey: string, { categoryId, limit }: { categoryId?: string; limit?: number } = {}) {
  const w = dayWindow(dateKey);
  if (!w) return { items: [] as ListingCard[], count: 0, volume: 0 };
  const groups = await db.payment.groupBy({
    by: ["listingId"],
    where: { status: "SUCCEEDED", confirmedAt: { gte: w.start, lt: w.end }, listing: { status: "ACTIVE", ...(categoryId ? { categoryId } : {}) } },
    _sum: { amount: true },
    _max: { confirmedAt: true },
  });
  const ranked = rankDaily(groups.map((g) => ({ listingId: g.listingId, amount: g._sum.amount ?? 0, lastAt: g._max.confirmedAt ?? w.start })));
  const shown = limit ? ranked.slice(0, limit) : ranked;
  const rows = await db.listing.findMany({ where: { id: { in: shown.map((s) => s.listingId) } }, select: listingCardSelect });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = shown.flatMap((s) => {
    const row = byId.get(s.listingId);
    return row ? [toCard(row, s.rank, s.amount)] : [];
  });
  return { items, count: ranked.length, volume: ranked.reduce((sum, r) => sum + r.amount, 0) };
}

export type ArchiveEntry = {
  rank: number;
  listingId: string;
  slug: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  kind: "WEBSITE" | "X_PROFILE";
  category: { slug: string; name: string; icon: string };
  amount: number;
  isDemo: boolean;
};

/**
 * A past day's final ranking. The first time a finished day is requested its
 * result is frozen into DailySnapshot so later moderation doesn't rewrite history.
 * (The /api/cron/daily-snapshot endpoint does the same right after midnight UTC.)
 */
export async function getArchiveDay(dateKey: string, now = new Date()): Promise<{ entries: ArchiveEntry[]; frozenAt: Date } | null> {
  if (!dayWindow(dateKey) || dateKey >= toDateKey(now)) return null;
  const snap = await db.dailySnapshot.findUnique({ where: { date: dateKey } });
  if (snap) return { entries: snap.entries as unknown as ArchiveEntry[], frozenAt: snap.createdAt };
  return freezeDay(dateKey);
}

export async function freezeDay(dateKey: string) {
  const existing = await db.dailySnapshot.findUnique({ where: { date: dateKey } });
  if (existing) return { entries: existing.entries as unknown as ArchiveEntry[], frozenAt: existing.createdAt };
  const board = await getDailyBoard(dateKey);
  const entries: ArchiveEntry[] = board.items.map((i) => ({
    rank: i.rank,
    listingId: i.id,
    slug: i.slug,
    name: i.name,
    domain: i.domain,
    logoUrl: i.logoUrl,
    kind: i.kind,
    category: i.category,
    amount: i.amount,
    isDemo: i.isDemo,
  }));
  // Days without payments aren't stored, so browsing arbitrary dates can't fill the table.
  if (!entries.length) return { entries, frozenAt: new Date() };
  const snap = await db.dailySnapshot.upsert({ where: { date: dateKey }, create: { date: dateKey, entries: entries as unknown as Prisma.InputJsonValue }, update: {} });
  return { entries: snap.entries as unknown as ArchiveEntry[], frozenAt: snap.createdAt };
}

/** UTC days (YYYY-MM-DD) in the last `days` days that had at least one confirmed payment. */
export async function getActiveDays(days = 120, now = new Date()): Promise<string[]> {
  const since = new Date(utcDayStart(now).getTime() - days * 86_400_000);
  const rows = await db.$queryRaw<{ day: string }[]>`
    SELECT DISTINCT to_char("confirmedAt", 'YYYY-MM-DD') AS day
    FROM "Payment"
    WHERE "status" = 'SUCCEEDED' AND "confirmedAt" >= ${since}
    ORDER BY day DESC`;
  return rows.map((r) => r.day);
}

export async function getRecentActivity(limit = 8) {
  const rows = await db.payment.findMany({
    where: { status: "SUCCEEDED", listing: { status: "ACTIVE" } },
    orderBy: { confirmedAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      amount: true,
      targetTotal: true,
      finalRank: true,
      confirmedAt: true,
      isDemo: true,
      listing: { select: { slug: true, name: true, logoUrl: true, domain: true, kind: true } },
    },
  });
  return rows.map((r) => ({ ...r, confirmedAt: r.confirmedAt?.toISOString() ?? null }));
}
export type ActivityItem = Awaited<ReturnType<typeof getRecentActivity>>[number];

export const getEnabledCategories = cache(() =>
  db.category.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, slug: true, name: true, icon: true, description: true } }),
);

export async function getCategoriesOverview() {
  const categories = await getEnabledCategories();
  const counts = await db.listing.groupBy({ by: ["categoryId"], where: { status: "ACTIVE" }, _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  const leaders = await Promise.all(
    categories.map((c) => db.listing.findFirst({ where: { status: "ACTIVE", categoryId: c.id }, orderBy: ACTIVE_ORDER, select: { slug: true, name: true, logoUrl: true, domain: true, kind: true, totalAmount: true } })),
  );
  return categories.map((c, i) => ({ ...c, count: countMap.get(c.id) ?? 0, leader: leaders[i] }));
}

/** Everything the public product page needs. Hidden/removed/pending listings are not public. */
export async function getListingDetail(slug: string, now = new Date()) {
  const listing = await db.listing.findUnique({
    where: { slug },
    select: { ...listingCardSelect, status: true, categoryId: true, ogImageUrl: true },
  });
  if (!listing || listing.status !== "ACTIVE") return null;

  const settings = await getSettings();
  const [allEntries, catEntries, today, history, related] = await Promise.all([
    getBoardEntries(),
    getBoardEntries(listing.categoryId),
    getDailyBoard(toDateKey(now), { categoryId: undefined }),
    db.payment.findMany({
      where: { listingId: listing.id, status: "SUCCEEDED" },
      orderBy: { confirmedAt: "desc" },
      take: 12,
      select: { id: true, kind: true, amount: true, targetTotal: true, finalRank: true, confirmedAt: true, isDemo: true },
    }),
    db.listing.findMany({ where: { status: "ACTIVE", categoryId: listing.categoryId, id: { not: listing.id } }, orderBy: ACTIVE_ORDER, take: 4, select: listingCardSelect }),
  ]);

  const rankIn = (entries: BoardEntry[]) => rankEntries(entries).find((e) => e.id === listing.id)?.rank ?? null;
  const allTimeRank = rankIn(allEntries);
  const categoryRank = rankIn(catEntries);
  const todayEntry = today.items.find((i) => i.id === listing.id);
  const nextTotal = allTimeRank && allTimeRank > 1 ? requiredTotalForRank(allEntries, allTimeRank - 1, settings.rules, listing.id) : null;
  const catRanks = rankEntries(catEntries);
  const relatedCards = related.map((r) => toCard(r, catRanks.find((e) => e.id === r.id)?.rank ?? 0));

  return {
    listing: { ...toCard(listing, allTimeRank ?? 0), url: listing.url, ogImageUrl: listing.ogImageUrl },
    ownerId: listing.ownerId,
    allTimeRank,
    categoryRank,
    categoryCount: catEntries.length,
    boardCount: allEntries.length,
    todayRank: todayEntry?.rank ?? null,
    todayAmount: todayEntry?.amount ?? 0,
    /** Total needed to move up one place, and the extra this listing's owner would pay */
    nextUp: nextTotal ? { rank: allTimeRank! - 1, total: nextTotal, extra: nextTotal - listing.totalAmount } : null,
    history: history.map((h) => ({ ...h, confirmedAt: h.confirmedAt?.toISOString() ?? null })),
    related: relatedCards,
  };
}

/** Search across names, domains and category names (all-time ranks included). */
export async function searchListings({ q, categoryId, view = "all", limit = 50 }: { q: string; categoryId?: string; view?: "all" | "today"; limit?: number }) {
  const term = q.trim().slice(0, 80);
  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...(categoryId ? { categoryId } : {}),
    ...(term
      ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { domain: { contains: term, mode: "insensitive" } }, { category: { name: { contains: term, mode: "insensitive" } } }] }
      : {}),
  };
  const rows = await db.listing.findMany({ where, orderBy: ACTIVE_ORDER, take: limit, select: listingCardSelect });
  const ranks = new Map(rankEntries(await getBoardEntries()).map((e) => [e.id, e.rank]));
  let items = rows.map((r) => toCard(r, ranks.get(r.id) ?? 0));
  if (view === "today") {
    const today = await getDailyBoard(toDateKey());
    const daily = new Map(today.items.map((i) => [i.id, i]));
    items = items.filter((i) => daily.has(i.id)).map((i) => ({ ...i, amount: daily.get(i.id)!.amount, rank: daily.get(i.id)!.rank })).sort((a, b) => a.rank - b.rank);
  }
  return items;
}

export function sortCards(cards: ListingCard[]) {
  return [...cards].sort((a, b) => compareEntries({ id: a.id, total: a.amount, rankedAt: 0 }, { id: b.id, total: b.amount, rankedAt: 0 }));
}

/** Active listings by slug, in the given order, with their all-time rank (used for featured spots). */
export async function getCardsBySlugs(slugs: string[]): Promise<ListingCard[]> {
  if (!slugs.length) return [];
  const rows = await db.listing.findMany({ where: { slug: { in: slugs }, status: "ACTIVE" }, select: listingCardSelect });
  const ranks = new Map(rankEntries(await getBoardEntries()).map((e) => [e.id, e.rank]));
  return slugs.flatMap((s) => {
    const row = rows.find((r) => r.slug === s);
    return row ? [toCard(row, ranks.get(row.id) ?? 0)] : [];
  });
}

/** Prefill link for "outbid" buttons: the total needed to take a given position. */
export function outbidHref(rank: number, holderAmount: number, rules: { topIncrement: number; overtakeIncrement: number }, extra = "") {
  const amount = holderAmount + (rank === 1 ? rules.topIncrement : rules.overtakeIncrement);
  return { href: `/claim?amount=${amount}${extra}`, label: rank === 1 ? "Take #1" : `Claim #${rank}`, title: `Reach #${rank} with ${amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`, amount };
}

/**
 * Total a new listing needs to become #1 inside a category. It must beat the category leader;
 * if that would also put it above the overall #1, the overall #1 increment applies.
 */
export function amountToLeadCategory(categoryTop: number | null, overallTop: number | null, rules: { minAmount: number; topIncrement: number; overtakeIncrement: number }) {
  if (categoryTop === null) return rules.minAmount;
  let need = Math.max(rules.minAmount, categoryTop + (categoryTop === overallTop ? rules.topIncrement : rules.overtakeIncrement));
  if (overallTop !== null && need > overallTop && need < overallTop + rules.topIncrement) need = overallTop + rules.topIncrement;
  return need;
}

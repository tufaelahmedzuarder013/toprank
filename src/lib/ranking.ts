/**
 * Pure ranking logic. Used by the server for every authoritative calculation
 * and by the claim form for instant (non-binding) estimates.
 */
import type { RankingRules } from "@/config/defaults";

export type BoardEntry = { id: string; total: number; rankedAt: Date | string | number };
export type RankedEntry<T extends BoardEntry> = T & { rank: number };

const time = (d: BoardEntry["rankedAt"]) => new Date(d).getTime();

/** Highest total first; equal totals keep the listing that reached it earlier ahead. */
export function compareEntries(a: BoardEntry, b: BoardEntry): number {
  return b.total - a.total || time(a.rankedAt) - time(b.rankedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function rankEntries<T extends BoardEntry>(entries: readonly T[]): RankedEntry<T>[] {
  return [...entries].sort(compareEntries).map((e, i) => ({ ...e, rank: i + 1 }));
}

/**
 * Position a listing would hold if it reached `total` right now.
 * Anyone already at or above that total got there first, so they stay ahead.
 */
export function positionFor(entries: readonly BoardEntry[], total: number, excludeId?: string): number {
  let ahead = 0;
  for (const e of entries) if (e.id !== excludeId && e.total >= total) ahead++;
  return ahead + 1;
}

/** Total a listing needs to reach `rank` (1-based), given the other entries on the board. */
export function requiredTotalForRank(entries: readonly BoardEntry[], rank: number, rules: RankingRules, excludeId?: string): number {
  const others = entries.filter((e) => e.id !== excludeId).sort(compareEntries);
  if (!others.length) return rules.minAmount;
  if (rank <= 1) return Math.max(rules.minAmount, others[0].total + rules.topIncrement);
  const holder = others[rank - 1];
  if (!holder) return rules.minAmount;
  return Math.max(rules.minAmount, holder.total + rules.overtakeIncrement);
}

/** Amount needed to take #1 right now. */
export function topClaimTotal(entries: readonly BoardEntry[], rules: RankingRules, excludeId?: string) {
  return requiredTotalForRank(entries, 1, rules, excludeId);
}

export type ClaimIssue =
  | { code: "NOT_INTEGER"; message: string }
  | { code: "BELOW_MIN"; message: string; min: number }
  | { code: "ABOVE_MAX"; message: string; max: number }
  | { code: "NOT_INCREASED"; message: string; min: number }
  | { code: "TOP_GAP"; message: string; validOptions: [number, number] }
  | { code: "OVERTAKE_GAP"; message: string; validOptions: [number, number] };

export type ClaimEvaluation = {
  ok: boolean;
  issues: ClaimIssue[];
  /** What the customer pays now (new total minus what's already been paid) */
  charge: number;
  newTotal: number;
  estimatedRank: number;
  /** Amount needed to take #1 at the moment of evaluation */
  topClaim: number;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Validate a requested total for a new listing (currentTotal = 0) or an upgrade
 * of an existing listing (listingId + currentTotal). Never trusts client input:
 * the server calls this with the live board before creating a checkout.
 */
export function evaluateClaim(params: {
  entries: readonly BoardEntry[];
  rules: RankingRules;
  newTotal: number;
  currentTotal?: number;
  listingId?: string;
}): ClaimEvaluation {
  const { entries, rules, newTotal, listingId } = params;
  const currentTotal = params.currentTotal ?? 0;
  const isUpgrade = Boolean(listingId);
  const issues: ClaimIssue[] = [];
  const others = entries.filter((e) => e.id !== listingId).sort(compareEntries);
  const top = others[0];
  const topClaim = top ? Math.max(rules.minAmount, top.total + rules.topIncrement) : rules.minAmount;

  if (!Number.isFinite(newTotal) || !Number.isInteger(newTotal)) {
    issues.push({ code: "NOT_INTEGER", message: "Please enter a whole-dollar amount." });
  } else {
    if (isUpgrade) {
      if (newTotal <= currentTotal) {
        issues.push({ code: "NOT_INCREASED", message: `Your new total must be higher than your current ${usd(currentTotal)}.`, min: currentTotal + 1 });
      }
    } else if (newTotal < rules.minAmount) {
      issues.push({ code: "BELOW_MIN", message: `The minimum for a new listing is ${usd(rules.minAmount)}.`, min: rules.minAmount });
    }
    if (newTotal > rules.maxTotal) {
      issues.push({ code: "ABOVE_MAX", message: `The maximum total for a listing is ${usd(rules.maxTotal)}.`, max: rules.maxTotal });
    }

    // A listing that is already #1 can always add more; everyone else must clear the #1 increment.
    const self = isUpgrade ? entries.find((e) => e.id === listingId) : undefined;
    const currentlyFirst = Boolean(self && (!top || compareEntries(self, top) < 0));
    if (top && !currentlyFirst && newTotal > top.total && newTotal < top.total + rules.topIncrement) {
      issues.push({
        code: "TOP_GAP",
        message: `${usd(newTotal)} would beat the current #1 (${usd(top.total)}) but taking #1 needs at least ${usd(top.total + rules.topIncrement)}. Choose ${usd(top.total)} to sit just below #1, or ${usd(top.total + rules.topIncrement)} or more to take the top spot.`,
        validOptions: [top.total, top.total + rules.topIncrement],
      });
    } else if (rules.overtakeIncrement > 1) {
      const blocked = others.slice(1).find((e) => newTotal > e.total && newTotal < e.total + rules.overtakeIncrement);
      if (blocked) {
        issues.push({
          code: "OVERTAKE_GAP",
          message: `To move above a listing at ${usd(blocked.total)} you need at least ${usd(blocked.total + rules.overtakeIncrement)}.`,
          validOptions: [blocked.total, blocked.total + rules.overtakeIncrement],
        });
      }
    }
  }

  const safeTotal = Number.isFinite(newTotal) ? Math.floor(newTotal) : 0;
  return {
    ok: issues.length === 0,
    issues,
    charge: Math.max(0, safeTotal - currentTotal),
    newTotal: safeTotal,
    estimatedRank: positionFor(entries, safeTotal, listingId),
    topClaim,
  };
}

// ── Daily boards ────────────────────────────────────────────────────────────

export type DailySpend = { listingId: string; amount: number; lastAt: Date | string };

/** Rank a day's spend: most spent first; equal spend keeps whoever reached it first ahead. */
export function rankDaily<T extends DailySpend>(spends: readonly T[]): (T & { rank: number })[] {
  return [...spends]
    .sort((a, b) => b.amount - a.amount || new Date(a.lastAt).getTime() - new Date(b.lastAt).getTime() || (a.listingId < b.listingId ? -1 : 1))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

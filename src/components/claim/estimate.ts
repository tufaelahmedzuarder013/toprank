import { evaluateClaim, type BoardEntry, type ClaimEvaluation } from "@/lib/ranking";
import type { RankingRules } from "@/config/defaults";

/** Client-side, non-binding estimate from the board's totals (highest first). */
export function estimateFromTotals(totals: number[], rules: RankingRules, amount: number): ClaimEvaluation {
  const entries: BoardEntry[] = totals.map((total, i) => ({ id: `e${i}`, total, rankedAt: i }));
  return evaluateClaim({ entries, rules, newTotal: amount });
}

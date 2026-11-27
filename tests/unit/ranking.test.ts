import { describe, expect, it } from "vitest";
import { compareEntries, evaluateClaim, positionFor, rankDaily, rankEntries, requiredTotalForRank, type BoardEntry } from "@/lib/ranking";
import { defaultSettings } from "@/config/defaults";

const rules = defaultSettings.rules; // min 10, #1 +5, overtake +1, max 999,999
const at = (min: number) => new Date(Date.UTC(2026, 0, 1, 0, min));
const board: BoardEntry[] = [
  { id: "c", total: 50, rankedAt: at(3) },
  { id: "a", total: 100, rankedAt: at(1) },
  { id: "b", total: 80, rankedAt: at(2) },
  { id: "d", total: 50, rankedAt: at(1) }, // reached $50 before "c"
];

describe("ordering", () => {
  it("ranks by total, highest first", () => {
    expect(rankEntries(board).map((e) => e.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("keeps the earlier confirmed listing ahead on equal totals", () => {
    const [first, second] = rankEntries([
      { id: "late", total: 70, rankedAt: at(9) },
      { id: "early", total: 70, rankedAt: at(5) },
    ]);
    expect(first.id).toBe("early");
    expect(second.id).toBe("late");
    expect(compareEntries({ id: "x", total: 70, rankedAt: at(1) }, { id: "y", total: 70, rankedAt: at(2) })).toBeLessThan(0);
  });

  it("places a newcomer behind everyone at or above its total", () => {
    expect(positionFor(board, 100)).toBe(2); // ties #1 → goes second
    expect(positionFor(board, 101)).toBe(1);
    expect(positionFor(board, 50)).toBe(5); // behind both $50 listings
    expect(positionFor(board, 10)).toBe(5);
  });
});

describe("required amounts", () => {
  it("needs the #1 total plus the increment to take #1", () => {
    expect(requiredTotalForRank(board, 1, rules)).toBe(105);
  });
  it("needs one dollar more than the current holder for other positions", () => {
    expect(requiredTotalForRank(board, 2, rules)).toBe(81);
    expect(requiredTotalForRank(board, 3, rules)).toBe(51);
  });
  it("falls back to the minimum on an empty board or beyond the last place", () => {
    expect(requiredTotalForRank([], 1, rules)).toBe(10);
    expect(requiredTotalForRank(board, 9, rules)).toBe(10);
  });
  it("ignores the listing's own entry when it upgrades", () => {
    expect(requiredTotalForRank(board, 1, rules, "a")).toBe(85); // others' top is b at 80
  });
});

describe("evaluateClaim — new listings", () => {
  it("accepts a valid amount and estimates the position", () => {
    const r = evaluateClaim({ entries: board, rules, newTotal: 90 });
    expect(r.ok).toBe(true);
    expect(r.charge).toBe(90);
    expect(r.estimatedRank).toBe(2);
    expect(r.topClaim).toBe(105);
  });
  it("enforces the minimum, maximum and whole dollars", () => {
    expect(evaluateClaim({ entries: board, rules, newTotal: 9 }).issues[0].code).toBe("BELOW_MIN");
    expect(evaluateClaim({ entries: board, rules, newTotal: 1_000_000 }).issues[0].code).toBe("ABOVE_MAX");
    expect(evaluateClaim({ entries: board, rules, newTotal: 12.5 }).issues[0].code).toBe("NOT_INTEGER");
    expect(evaluateClaim({ entries: board, rules, newTotal: 10 }).ok).toBe(true);
    expect(evaluateClaim({ entries: [], rules, newTotal: 999_999 }).ok).toBe(true);
  });
  it("rejects amounts that beat #1 without the required increment and suggests valid ones", () => {
    for (const amount of [101, 102, 103, 104]) {
      const r = evaluateClaim({ entries: board, rules, newTotal: amount });
      expect(r.ok).toBe(false);
      expect(r.issues[0]).toMatchObject({ code: "TOP_GAP", validOptions: [100, 105] });
    }
    expect(evaluateClaim({ entries: board, rules, newTotal: 105 })).toMatchObject({ ok: true, estimatedRank: 1 });
    expect(evaluateClaim({ entries: board, rules, newTotal: 100 })).toMatchObject({ ok: true, estimatedRank: 2 });
  });
  it("lets a lower payment take the position its amount supports", () => {
    expect(evaluateClaim({ entries: board, rules, newTotal: 60 })).toMatchObject({ ok: true, estimatedRank: 3 });
  });
  it("respects a configured overtake increment", () => {
    const strict = { ...rules, overtakeIncrement: 5 };
    expect(evaluateClaim({ entries: board, rules: strict, newTotal: 82 }).issues[0].code).toBe("OVERTAKE_GAP");
    expect(evaluateClaim({ entries: board, rules: strict, newTotal: 85 }).ok).toBe(true);
  });
});

describe("evaluateClaim — upgrades", () => {
  it("charges only the difference", () => {
    const r = evaluateClaim({ entries: board, rules, listingId: "c", currentTotal: 50, newTotal: 70 });
    expect(r).toMatchObject({ ok: true, charge: 20, newTotal: 70, estimatedRank: 3 });
  });
  it("requires the new total to be higher than the current one", () => {
    expect(evaluateClaim({ entries: board, rules, listingId: "c", currentTotal: 50, newTotal: 50 }).issues[0].code).toBe("NOT_INCREASED");
  });
  it("applies the #1 increment to a listing that is not #1", () => {
    expect(evaluateClaim({ entries: board, rules, listingId: "b", currentTotal: 80, newTotal: 102 }).issues[0].code).toBe("TOP_GAP");
    expect(evaluateClaim({ entries: board, rules, listingId: "b", currentTotal: 80, newTotal: 105 })).toMatchObject({ ok: true, charge: 25, estimatedRank: 1 });
  });
  it("lets the current #1 add any amount", () => {
    expect(evaluateClaim({ entries: board, rules, listingId: "a", currentTotal: 100, newTotal: 101 })).toMatchObject({ ok: true, charge: 1, estimatedRank: 1 });
  });
  it("does not let the minimum block small upgrades", () => {
    expect(evaluateClaim({ entries: board, rules, listingId: "c", currentTotal: 50, newTotal: 51 })).toMatchObject({ ok: true, charge: 1 });
  });
});

describe("daily ranking", () => {
  it("ranks by the day's spend and breaks ties by who got there first", () => {
    const ranked = rankDaily([
      { listingId: "x", amount: 20, lastAt: at(30) },
      { listingId: "y", amount: 40, lastAt: at(40) },
      { listingId: "z", amount: 20, lastAt: at(10) },
    ]);
    expect(ranked.map((r) => [r.listingId, r.rank])).toEqual([
      ["y", 1],
      ["z", 2],
      ["x", 3],
    ]);
  });
});

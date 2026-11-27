import { describe, expect, it } from "vitest";
import { contrast, ensureContrast, solidPair } from "@/lib/color";
import { amountToLeadCategory, outbidHref } from "@/server/leaderboard";
import { defaultSettings } from "@/config/defaults";

const rules = defaultSettings.rules;

describe("brand colours stay accessible", () => {
  for (const hex of ["#FF6A3D", "#7C5CFF", "#FFD400", "#00C2A8", "#111111", "#FFFFFF"]) {
    it(`button text on ${hex} meets WCAG AA`, () => {
      const { bg, fg } = solidPair(hex);
      expect(contrast(bg, fg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`text ink for ${hex} meets AA on light and dark surfaces`, () => {
      expect(contrast(ensureContrast(hex, "#ffffff", 4.6), "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ensureContrast(hex, "#111116", 5), "#111116")).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("category #1 amount", () => {
  it("needs one dollar more than the category leader", () => {
    expect(amountToLeadCategory(300, 4820, rules)).toBe(301);
  });
  it("uses the #1 increment when the category leader is also the overall #1", () => {
    expect(amountToLeadCategory(4820, 4820, rules)).toBe(4825);
  });
  it("can tie the overall #1 when that's enough to lead the category", () => {
    expect(amountToLeadCategory(4819, 4820, rules)).toBe(4820);
  });
  it("never lands inside the overall #1 gap", () => {
    expect(amountToLeadCategory(4819, 4820, { ...rules, overtakeIncrement: 3 })).toBe(4825);
  });
  it("starts at the minimum for an empty category", () => {
    expect(amountToLeadCategory(null, 4820, rules)).toBe(10);
  });
});

describe("outbid links", () => {
  it("prefills the amount needed to take a position", () => {
    expect(outbidHref(1, 100, rules)).toMatchObject({ href: "/claim?amount=105", label: "Take #1" });
    expect(outbidHref(4, 60, rules, "&category=seo")).toMatchObject({ href: "/claim?amount=61&category=seo", label: "Claim #4" });
  });
});

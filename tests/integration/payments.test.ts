import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { startNewListingCheckout, startUpgradeCheckout } from "@/server/claims";
import { closePayment, confirmPayment, settleRefund } from "@/server/payments";
import { freezeDay, getAllTimeBoard, getArchiveDay, getDailyBoard } from "@/server/leaderboard";
import { toDateKey } from "@/lib/time";
import { claim, makeUser, minutes, resetDb } from "./helpers";

async function paidListing(target: string, amount: number, now = new Date(), extra: Parameters<typeof claim>[2] = {}) {
  const res = await startNewListingCheckout(claim(target, amount, extra), now);
  if (!res.ok) throw new Error(`${res.code}: ${res.error}`);
  const out = await confirmPayment({ paymentId: res.paymentId, now });
  if (out.outcome !== "confirmed") throw new Error(`unexpected ${out.outcome}`);
  return { ...out, paymentId: res.paymentId };
}

beforeEach(resetDb);

describe("new listing claims", () => {
  it("reserves the link, then activates it only once payment is confirmed", async () => {
    const res = await startNewListingCheckout(claim("acme.example.com", 25));
    expect(res).toMatchObject({ ok: true, url: expect.stringMatching(/^\/checkout\/demo\//) });
    if (!res.ok) return;

    const pending = await db.listing.findFirstOrThrow({ where: { urlKey: "acme.example.com" } });
    expect(pending.status).toBe("PENDING");
    expect(pending.pendingPaymentId).toBe(res.paymentId);
    expect((await getAllTimeBoard()).count).toBe(0); // not on the board before payment

    const out = await confirmPayment({ paymentId: res.paymentId });
    expect(out).toMatchObject({ outcome: "confirmed", finalRank: 1, newTotal: 25 });
    const active = await db.listing.findUniqueOrThrow({ where: { id: pending.id } });
    expect(active).toMatchObject({ status: "ACTIVE", totalAmount: 25, pendingPaymentId: null });
    expect(await db.payment.findUniqueOrThrow({ where: { id: res.paymentId } })).toMatchObject({ status: "SUCCEEDED", finalRank: 1, isDemo: true });
  });

  it("validates the amount on the server against the live board", async () => {
    await paidListing("leader.example.com", 100);
    const gap = await startNewListingCheckout(claim("chaser.example.com", 103));
    expect(gap).toMatchObject({ ok: false, code: "INVALID_AMOUNT" });
    expect(!gap.ok && gap.issues?.[0]).toMatchObject({ code: "TOP_GAP", validOptions: [100, 105] });
    expect(await startNewListingCheckout(claim("tiny.example.com", 5))).toMatchObject({ ok: false, code: "INVALID_AMOUNT" });
    expect(await startNewListingCheckout(claim("chaser.example.com", 105))).toMatchObject({ ok: true });
  });

  it("rejects invalid links, unknown categories and duplicates", async () => {
    expect(await startNewListingCheckout(claim("http://127.0.0.1/admin", 20))).toMatchObject({ ok: false, code: "INVALID_TARGET" });
    expect(await startNewListingCheckout(claim("ok.example.com", 20, { category: "nope" }))).toMatchObject({ ok: false, code: "INVALID_CATEGORY" });
    await paidListing("taken.example.com", 20);
    expect(await startNewListingCheckout(claim("https://www.TAKEN.example.com/", 50))).toMatchObject({ ok: false, code: "DUPLICATE" });
  });

  it("blocks a second checkout for the same link while one is in progress", async () => {
    const now = new Date();
    const first = await startNewListingCheckout(claim("@samehandle", 20), now);
    expect(first.ok).toBe(true);
    expect(await startNewListingCheckout(claim("x.com/SameHandle", 30), minutes(now, 5))).toMatchObject({ ok: false, code: "RESERVED" });
  });

  it("frees the link when checkout is cancelled", async () => {
    const first = await startNewListingCheckout(claim("cancel.example.com", 20));
    if (!first.ok) throw new Error();
    expect(await closePayment({ paymentId: first.paymentId, status: "CANCELED" })).toMatchObject({ outcome: "closed" });
    expect(await startNewListingCheckout(claim("cancel.example.com", 20))).toMatchObject({ ok: true });
    expect(await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).toMatchObject({ status: "CANCELED" });
  });

  it("refunds a late payment for a link someone else already secured", async () => {
    const now = new Date();
    const first = await startNewListingCheckout(claim("race.example.com", 20, { name: "First" }), now);
    if (!first.ok) throw new Error();
    // The reservation lapses and someone else claims and pays.
    const later = minutes(now, 40);
    const second = await startNewListingCheckout(claim("race.example.com", 30, { name: "Second" }), later);
    if (!second.ok) throw new Error();
    expect(await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).toMatchObject({ status: "EXPIRED" });
    await confirmPayment({ paymentId: second.paymentId, now: later });

    const late = await confirmPayment({ paymentId: first.paymentId, now: minutes(later, 1) });
    expect(late.outcome).toBe("refund_required");
    await settleRefund(first.paymentId);
    expect(await db.payment.findUniqueOrThrow({ where: { id: first.paymentId } })).toMatchObject({ status: "REFUNDED" });
    const listing = await db.listing.findFirstOrThrow({ where: { urlKey: "race.example.com" } });
    expect(listing).toMatchObject({ name: "Second", totalAmount: 30 });
  });

  it("applies a late payment with the payer's own details when nobody else holds the link", async () => {
    const now = new Date();
    const a = await startNewListingCheckout(claim("late.example.com", 20, { name: "Alpha" }), now);
    if (!a.ok) throw new Error();
    await closePayment({ paymentId: a.paymentId, status: "CANCELED", now });
    const b = await startNewListingCheckout(claim("late.example.com", 40, { name: "Bravo" }), minutes(now, 1));
    if (!b.ok) throw new Error();
    await closePayment({ paymentId: b.paymentId, status: "FAILED", now: minutes(now, 2) });

    // Alpha's hosted checkout completes late anyway — it gets the link with Alpha's details.
    expect(await confirmPayment({ paymentId: a.paymentId, now: minutes(now, 3) })).toMatchObject({ outcome: "confirmed", newTotal: 20 });
    expect(await db.listing.findFirstOrThrow({ where: { urlKey: "late.example.com" } })).toMatchObject({ name: "Alpha", totalAmount: 20, status: "ACTIVE" });
  });
});

describe("idempotency and concurrency", () => {
  it("ignores duplicate provider events", async () => {
    const res = await startNewListingCheckout(claim("dupe.example.com", 50));
    if (!res.ok) throw new Error();
    const event = { id: "evt_test_123", type: "checkout.session.completed", provider: "STRIPE" as const };
    expect((await confirmPayment({ paymentId: res.paymentId, event })).outcome).toBe("confirmed");
    expect((await confirmPayment({ paymentId: res.paymentId, event })).outcome).toBe("duplicate_event");
    // A different event (or the success-page sync) for the same payment doesn't double count either.
    expect((await confirmPayment({ paymentId: res.paymentId, event: { ...event, id: "evt_test_456" } })).outcome).toBe("already_confirmed");
    expect((await confirmPayment({ paymentId: res.paymentId })).outcome).toBe("already_confirmed");
    expect(await db.listing.findFirstOrThrow({ where: { urlKey: "dupe.example.com" } })).toMatchObject({ totalAmount: 50 });
    expect(await db.webhookEvent.count()).toBe(2);
  });

  it("handles the same event delivered in parallel exactly once", async () => {
    const owner = await makeUser();
    const { listingId } = await paidListing("parallel.example.com", 20, new Date(), { userId: owner.id });
    await db.listing.update({ where: { id: listingId }, data: { ownerId: owner.id, verifiedAt: new Date() } });
    const up = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 60 });
    if (!up.ok) throw new Error(up.error);
    const event = { id: "evt_parallel", type: "checkout.session.completed", provider: "STRIPE" as const };
    const results = await Promise.all(Array.from({ length: 5 }, () => confirmPayment({ paymentId: up.paymentId, event })));
    expect(results.filter((r) => r.outcome === "confirmed")).toHaveLength(1);
    expect(await db.listing.findUniqueOrThrow({ where: { id: listingId } })).toMatchObject({ totalAmount: 60 });
  });

  it("ranks simultaneous claims by total and confirmation order", async () => {
    await paidListing("base.example.com", 100);
    const claims = await Promise.all([
      startNewListingCheckout(claim("one.example.com", 105)),
      startNewListingCheckout(claim("two.example.com", 105)),
      startNewListingCheckout(claim("three.example.com", 110)),
    ]);
    expect(claims.every((c) => c.ok)).toBe(true);
    const ids = claims.map((c) => (c.ok ? c.paymentId : ""));
    // Every checkout was estimated against the same board…
    const estimates = await db.payment.findMany({ where: { id: { in: ids } }, select: { estimatedRank: true } });
    expect(estimates.every((e) => e.estimatedRank === 1)).toBe(true);

    // …but final ranks are recalculated at confirmation.
    const now = new Date();
    const r1 = await confirmPayment({ paymentId: ids[0], now });
    const r2 = await confirmPayment({ paymentId: ids[1], now: minutes(now, 1) });
    const r3 = await confirmPayment({ paymentId: ids[2], now: minutes(now, 2) });
    expect([r1, r2, r3].map((r) => r.outcome === "confirmed" && r.finalRank)).toEqual([1, 2, 1]);
    const board = await getAllTimeBoard();
    expect(board.items.map((i) => [i.domain, i.rank])).toEqual([
      ["three.example.com", 1],
      ["one.example.com", 2],
      ["two.example.com", 3],
      ["base.example.com", 4],
    ]);
  });

  it("serialises parallel confirmations so ranks stay consistent", async () => {
    const starts = await Promise.all([10, 20, 30, 40, 50].map((a, i) => startNewListingCheckout(claim(`p${i}.example.com`, a))));
    const results = await Promise.all(starts.map((s) => (s.ok ? confirmPayment({ paymentId: s.paymentId }) : null)));
    expect(results.every((r) => r?.outcome === "confirmed")).toBe(true);
    const board = await getAllTimeBoard();
    expect(board.items.map((i) => i.amount)).toEqual([50, 40, 30, 20, 10]);
  });
});

describe("ties", () => {
  it("keeps the listing that reached the amount first ahead", async () => {
    const t0 = new Date("2026-05-01T10:00:00Z");
    await paidListing("early.example.com", 40, t0);
    await paidListing("late.example.com", 40, minutes(t0, 30));
    const board = await getAllTimeBoard();
    expect(board.items.map((i) => i.domain)).toEqual(["early.example.com", "late.example.com"]);
  });
});

describe("upgrades", () => {
  it("only lets the verified owner upgrade and charges just the difference", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const { listingId } = await paidListing("mine.example.com", 30, new Date(), { userId: owner.id });
    await paidListing("rival.example.com", 80);

    // Not verified yet → rejected even for the creator.
    expect(await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 90 })).toMatchObject({ ok: false, code: "NOT_OWNER" });
    await db.listing.update({ where: { id: listingId }, data: { ownerId: owner.id, verifiedAt: new Date() } });
    expect(await startUpgradeCheckout({ listingId, userId: stranger.id, newTotal: 90 })).toMatchObject({ ok: false, code: "NOT_OWNER" });
    expect(await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 82 })).toMatchObject({ ok: false, code: "INVALID_AMOUNT" }); // needs $85 for #1

    const up = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 85 });
    if (!up.ok) throw new Error(up.error);
    const payment = await db.payment.findUniqueOrThrow({ where: { id: up.paymentId } });
    expect(payment).toMatchObject({ kind: "UPGRADE", amount: 55, previousTotal: 30, targetTotal: 85, estimatedRank: 1 });

    expect(await confirmPayment({ paymentId: up.paymentId })).toMatchObject({ outcome: "confirmed", newTotal: 85, finalRank: 1 });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listingId } })).toMatchObject({ totalAmount: 85 });
  });

  it("adds what was actually paid when two upgrades overlap", async () => {
    const owner = await makeUser();
    const { listingId } = await paidListing("stack.example.com", 20, new Date(), { userId: owner.id });
    await db.listing.update({ where: { id: listingId }, data: { ownerId: owner.id, verifiedAt: new Date() } });
    const a = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 30 });
    const b = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 50 });
    if (!a.ok || !b.ok) throw new Error();
    await confirmPayment({ paymentId: a.paymentId });
    await confirmPayment({ paymentId: b.paymentId });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listingId } })).toMatchObject({ totalAmount: 20 + 10 + 30 });
  });

  it("refunds an upgrade for a listing that was removed meanwhile", async () => {
    const owner = await makeUser();
    const { listingId } = await paidListing("gone.example.com", 20, new Date(), { userId: owner.id });
    await db.listing.update({ where: { id: listingId }, data: { ownerId: owner.id, verifiedAt: new Date() } });
    const up = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 40 });
    if (!up.ok) throw new Error();
    await db.listing.update({ where: { id: listingId }, data: { status: "REMOVED" } });
    expect((await confirmPayment({ paymentId: up.paymentId })).outcome).toBe("refund_required");
    expect(await db.listing.findUniqueOrThrow({ where: { id: listingId } })).toMatchObject({ totalAmount: 20 });
  });
});

describe("daily boards", () => {
  it("counts only the day's payments and resets at midnight UTC", async () => {
    const owner = await makeUser();
    const yesterday = new Date("2026-06-01T23:59:00Z");
    const today = new Date("2026-06-02T00:01:00Z");

    const { listingId } = await paidListing("daily.example.com", 50, yesterday, { userId: owner.id });
    await paidListing("fresh.example.com", 30, today);
    await db.listing.update({ where: { id: listingId }, data: { ownerId: owner.id, verifiedAt: yesterday } });
    const up = await startUpgradeCheckout({ listingId, userId: owner.id, newTotal: 60 });
    if (!up.ok) throw new Error();
    await confirmPayment({ paymentId: up.paymentId, now: minutes(today, 5) });

    const y = await getDailyBoard(toDateKey(yesterday));
    expect(y.items.map((i) => [i.domain, i.amount])).toEqual([["daily.example.com", 50]]);

    // Today: fresh paid $30, daily.example.com only $10 today (its upgrade), even though its all-time total is $60.
    const t = await getDailyBoard(toDateKey(today));
    expect(t.items.map((i) => [i.domain, i.amount, i.rank])).toEqual([
      ["fresh.example.com", 30, 1],
      ["daily.example.com", 10, 2],
    ]);
    expect(t.volume).toBe(40);
    expect((await getAllTimeBoard()).items[0]).toMatchObject({ domain: "daily.example.com", amount: 60 });

    // The same payment counts on all-time, today, and category boards.
    expect((await getDailyBoard(toDateKey(today), { categoryId: (await db.category.findFirstOrThrow({ where: { slug: "ai-tools" } })).id })).count).toBe(2);
  });

  it("freezes finished days into the archive", async () => {
    const day = new Date("2026-04-10T12:00:00Z");
    await paidListing("archived.example.com", 25, day);
    expect(await getArchiveDay("2026-04-11", new Date("2026-04-11T08:00:00Z"))).toBeNull(); // today isn't archived yet
    const frozen = await getArchiveDay("2026-04-10", new Date("2026-04-11T00:00:05Z"));
    expect(frozen?.entries).toEqual([expect.objectContaining({ rank: 1, domain: "archived.example.com", amount: 25 })]);

    // Later moderation doesn't rewrite a frozen day.
    await db.listing.updateMany({ data: { status: "HIDDEN" } });
    expect((await getArchiveDay("2026-04-10", new Date("2026-04-12T00:00:00Z")))?.entries).toHaveLength(1);
    expect((await freezeDay("2026-04-10")).entries).toHaveLength(1);
  });
});

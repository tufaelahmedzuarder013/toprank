import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { db } from "@/server/db";
import { POST } from "@/app/api/webhooks/stripe/route";
import { resetDb } from "./helpers";

const SECRET = "whsec_test_toprung";
const stripe = new Stripe("sk_test_dummy");

beforeAll(() => {
  // Only signature verification runs locally — no request is sent to Stripe in these tests.
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
});
beforeEach(resetDb);

async function pendingStripeClaim(amount: number, sessionId = "cs_test_1") {
  const category = await db.category.findFirstOrThrow();
  const listing = await db.listing.create({
    data: { slug: "hooked", kind: "WEBSITE", urlKey: "hooked.example.com", url: "https://hooked.example.com/", domain: "hooked.example.com", name: "Hooked", categoryId: category.id },
  });
  const payment = await db.payment.create({
    data: { listingId: listing.id, kind: "NEW_LISTING", amount, previousTotal: 0, targetTotal: amount, provider: "STRIPE", providerSessionId: sessionId, estimatedRank: 1 },
  });
  await db.listing.update({ where: { id: listing.id }, data: { pendingPaymentId: payment.id, reservedUntil: new Date(Date.now() + 30 * 60_000) } });
  return { listing, payment };
}

function sessionEvent(id: string, type: string, session: Record<string, unknown>) {
  return JSON.stringify({ id, object: "event", type, api_version: "2026-11-18.endive", created: Math.floor(Date.now() / 1000), livemode: false, data: { object: { object: "checkout.session", currency: "usd", ...session } } });
}

function deliver(payload: string, signature = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })) {
  return POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature, "content-type": "application/json" } }));
}

describe("Stripe webhook", () => {
  it("rejects requests without a valid signature", async () => {
    const payload = sessionEvent("evt_bad", "checkout.session.completed", { id: "cs_x" });
    expect((await deliver(payload, "t=1,v1=deadbeef")).status).toBe(400);
    const forged = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong" });
    expect((await deliver(payload, forged)).status).toBe(400);
    expect((await POST(new Request("http://localhost/x", { method: "POST", body: payload }))).status).toBe(400);
  });

  it("confirms a paid session once, even when Stripe retries the event", async () => {
    const { listing, payment } = await pendingStripeClaim(25);
    const payload = sessionEvent("evt_paid_1", "checkout.session.completed", {
      id: "cs_test_1",
      amount_total: 2500,
      payment_status: "paid",
      payment_intent: "pi_test_1",
      client_reference_id: payment.id,
      metadata: { paymentId: payment.id, listingId: listing.id, kind: "NEW_LISTING" },
    });

    const first = await deliver(payload);
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, outcome: "confirmed" });
    const retry = await deliver(payload);
    expect(await retry.json()).toMatchObject({ outcome: "duplicate_event" });

    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "SUCCEEDED", providerPaymentId: "pi_test_1", finalRank: 1 });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ status: "ACTIVE", totalAmount: 25 });
  });

  it("never applies a session whose amount doesn't match", async () => {
    const { payment } = await pendingStripeClaim(25);
    const payload = sessionEvent("evt_tampered", "checkout.session.completed", { id: "cs_test_1", amount_total: 100, payment_status: "paid", metadata: { paymentId: payment.id } });
    expect(await (await deliver(payload)).json()).toMatchObject({ outcome: "mismatch" });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "PENDING" });
  });

  it("waits for delayed payment methods and handles their failure", async () => {
    const { listing, payment } = await pendingStripeClaim(40);
    const base = { id: "cs_test_1", amount_total: 4000, metadata: { paymentId: payment.id } };
    expect(await (await deliver(sessionEvent("evt_async_1", "checkout.session.completed", { ...base, payment_status: "unpaid" }))).json()).toMatchObject({ outcome: "pending" });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ status: "PENDING" });

    expect(await (await deliver(sessionEvent("evt_async_2", "checkout.session.async_payment_failed", base))).json()).toMatchObject({ outcome: "closed" });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "FAILED" });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ status: "PENDING", pendingPaymentId: null });
  });

  it("releases the reservation when checkout expires", async () => {
    const { listing, payment } = await pendingStripeClaim(15);
    const res = await deliver(sessionEvent("evt_exp", "checkout.session.expired", { id: "cs_test_1", amount_total: 1500, payment_status: "unpaid", metadata: { paymentId: payment.id } }));
    expect(await res.json()).toMatchObject({ outcome: "closed" });
    expect(await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).toMatchObject({ status: "EXPIRED" });
    expect(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ pendingPaymentId: null });
  });

  it("ignores unrelated events", async () => {
    const payload = JSON.stringify({ id: "evt_other", object: "event", type: "customer.created", data: { object: { id: "cus_1", object: "customer" } } });
    expect(await (await deliver(payload)).json()).toMatchObject({ outcome: "ignored" });
  });
});

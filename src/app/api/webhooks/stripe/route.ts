import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/payment-provider";
import { handleStripeEvent } from "@/server/stripe-events";

/**
 * Stripe webhook endpoint. Point your Stripe webhook (or `stripe listen --forward-to`)
 * at /api/webhooks/stripe and subscribe to:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !secret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json({ received: true, outcome: "outcome" in result ? result.outcome : "handled" });
  } catch (e) {
    console.error("[stripe] webhook handling failed", e);
    // A 5xx makes Stripe retry; processing is idempotent so retries are safe.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

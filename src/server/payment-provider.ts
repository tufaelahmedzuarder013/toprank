import "server-only";
import Stripe from "stripe";

/**
 * Payment provider abstraction.
 * - "stripe": hosted Stripe Checkout (use test keys until you go live)
 * - "demo":   no credentials configured — a clearly labelled simulated checkout
 */
export type PaymentMode = "stripe" | "demo";

export function paymentMode(): PaymentMode {
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "demo";
}

export function isStripeTestMode() {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  stripeClient ??= new Stripe(key, { appInfo: { name: "Toprung" }, maxNetworkRetries: 2 });
  return stripeClient;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export type CheckoutRequest = {
  paymentId: string;
  listingId: string;
  amount: number;
  kind: "NEW_LISTING" | "UPGRADE";
  productName: string;
  description: string;
  customerEmail?: string | null;
};

export async function createCheckoutSession(req: CheckoutRequest): Promise<{ sessionId: string; url: string }> {
  if (paymentMode() === "demo") {
    return { sessionId: `demo_${req.paymentId}`, url: `/checkout/demo/${req.paymentId}` };
  }
  const base = siteUrl();
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: req.amount * 100,
            product_data: { name: req.productName, description: req.description.slice(0, 300) || undefined },
          },
        },
      ],
      client_reference_id: req.paymentId,
      metadata: { paymentId: req.paymentId, listingId: req.listingId, kind: req.kind },
      payment_intent_data: { metadata: { paymentId: req.paymentId, listingId: req.listingId } },
      customer_email: req.customerEmail ?? undefined,
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment/cancelled?payment=${req.paymentId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout_${req.paymentId}` },
  );
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { sessionId: session.id, url: session.url };
}

export async function retrieveCheckoutSession(sessionId: string) {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

/**
 * Expire an open Stripe Checkout Session so it can no longer be paid. Safe to call on closed sessions.
 * Returns the session's state afterwards: "complete" means the customer already submitted payment
 * (possibly a delayed method still processing), so the payment must not be closed locally.
 */
export async function expireCheckoutSession(sessionId: string): Promise<"expired" | "complete" | "unknown"> {
  if (paymentMode() !== "stripe" || sessionId.startsWith("demo_")) return "expired";
  try {
    const s = await getStripe().checkout.sessions.retrieve(sessionId);
    if (s.status === "complete") return "complete";
    if (s.status === "open") await getStripe().checkout.sessions.expire(sessionId);
    return "expired";
  } catch {
    // Unreachable — the webhook remains the source of truth.
    return "unknown";
  }
}

export async function refundProviderPayment(providerPaymentId: string, paymentId: string) {
  await getStripe().refunds.create({ payment_intent: providerPaymentId, reason: "duplicate", metadata: { paymentId } }, { idempotencyKey: `refund_${paymentId}` });
}

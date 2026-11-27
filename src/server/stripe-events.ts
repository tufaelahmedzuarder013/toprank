import "server-only";
import type Stripe from "stripe";
import { db } from "@/server/db";
import { closePayment, confirmPayment, settleRefund } from "@/server/payments";
import { retrieveCheckoutSession } from "@/server/payment-provider";

function paymentIdOf(session: Stripe.Checkout.Session) {
  return session.metadata?.paymentId ?? session.client_reference_id ?? null;
}

function intentId(session: Stripe.Checkout.Session) {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

async function confirmFromSession(session: Stripe.Checkout.Session, event?: { id: string; type: string }) {
  const paymentId = paymentIdOf(session);
  if (!paymentId) return { outcome: "ignored", reason: "no payment reference" };
  const payment = await db.payment.findUnique({ where: { id: paymentId }, select: { amount: true, providerSessionId: true } });
  if (!payment) return { outcome: "not_found" };
  // Never trust a session that doesn't match what we asked the customer to pay.
  if (session.amount_total !== payment.amount * 100 || session.currency !== "usd" || (payment.providerSessionId && payment.providerSessionId !== session.id)) {
    console.error(`[stripe] session ${session.id} does not match payment ${paymentId}; not applied`);
    return { outcome: "mismatch" };
  }
  const result = await confirmPayment({ paymentId, providerPaymentId: intentId(session), event: event ? { ...event, provider: "STRIPE" } : undefined });
  if (result.outcome === "refund_required") await settleRefund(result.paymentId);
  return result;
}

/** Handles verified Stripe events. Safe to receive the same event more than once. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "unpaid") {
        // Delayed payment methods: wait for async_payment_succeeded / _failed.
        return { outcome: "pending" };
      }
      return confirmFromSession(session, { id: event.id, type: event.type });
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = paymentIdOf(session);
      if (!paymentId) return { outcome: "ignored" };
      return closePayment({ paymentId, status: "FAILED", reason: "The payment method was declined.", event: { id: event.id, type: event.type, provider: "STRIPE" } });
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = paymentIdOf(session);
      if (!paymentId) return { outcome: "ignored" };
      return closePayment({ paymentId, status: "EXPIRED", reason: "Checkout expired before payment.", event: { id: event.id, type: event.type, provider: "STRIPE" } });
    }
    default:
      return { outcome: "ignored" };
  }
}

/**
 * Fallback used by the success page when the webhook hasn't arrived yet:
 * asks Stripe directly (server-to-server) whether the session is paid.
 */
export async function syncStripeSession(sessionId: string) {
  const session = await retrieveCheckoutSession(sessionId);
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return confirmFromSession(session);
  return { outcome: "pending" };
}

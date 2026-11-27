"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { ownsCheckout } from "@/server/checkout-cookie";
import { paymentMode } from "@/server/payment-provider";
import { closePayment, confirmPayment, settleRefund } from "@/server/payments";

/**
 * Demo-mode checkout. Only available when no payment provider is configured, only for
 * DEMO payments, and only from the browser that started the checkout. No money moves.
 */
async function guard(paymentId: string) {
  if (paymentMode() !== "demo") throw new Error("Demo checkout is disabled because a payment provider is configured.");
  const payment = await db.payment.findUnique({ where: { id: paymentId }, select: { id: true, provider: true, status: true } });
  if (!payment || payment.provider !== "DEMO") throw new Error("Checkout not found.");
  if (!(await ownsCheckout(paymentId))) throw new Error("This checkout was started in another browser.");
  return payment;
}

export async function demoPayAction(paymentId: string) {
  await guard(paymentId);
  const result = await confirmPayment({ paymentId, providerPaymentId: `demo_pi_${paymentId}`, event: { id: `demo_${paymentId}_succeeded`, type: "demo.payment_succeeded", provider: "DEMO" } });
  if (result.outcome === "refund_required") await settleRefund(result.paymentId);
  redirect(`/payment/success?payment=${paymentId}`);
}

export async function demoDeclineAction(paymentId: string) {
  await guard(paymentId);
  await closePayment({ paymentId, status: "FAILED", reason: "Demo: the test card was declined.", event: { id: `demo_${paymentId}_failed`, type: "demo.payment_failed", provider: "DEMO" } });
  redirect(`/payment/cancelled?payment=${paymentId}`);
}

export async function demoCancelAction(paymentId: string) {
  await guard(paymentId);
  await closePayment({ paymentId, status: "CANCELED", reason: "Checkout was cancelled." });
  redirect(`/payment/cancelled?payment=${paymentId}`);
}

import "server-only";
import { db, withRankingLock, type Tx } from "@/server/db";
import { positionFor } from "@/lib/ranking";
import { loadBoardEntries } from "@/server/leaderboard";
import { refundProviderPayment } from "@/server/payment-provider";
import type { PaymentProvider } from "@/generated/prisma/client";

export type ProviderEvent = { id: string; type: string; provider: PaymentProvider };

export type ConfirmOutcome =
  | { outcome: "confirmed"; paymentId: string; listingId: string; finalRank: number; newTotal: number }
  | { outcome: "already_confirmed"; paymentId: string }
  | { outcome: "duplicate_event" }
  | { outcome: "refund_required"; paymentId: string; reason: string }
  | { outcome: "not_found" }
  | { outcome: "not_pending"; status: string };

function parseClaimDetails(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : null);
  if (!str(v.name) || !str(v.categoryId)) return null;
  return { name: str(v.name)!, description: str(v.description) ?? "", logoUrl: str(v.logoUrl), ogImageUrl: str(v.ogImageUrl), categoryId: str(v.categoryId)! };
}

/** Records a provider event id; returns false if it was already processed. */
async function claimEvent(tx: Tx, event?: ProviderEvent) {
  if (!event) return true;
  const res = await tx.webhookEvent.createMany({ data: [{ id: event.id, provider: event.provider, type: event.type }], skipDuplicates: true });
  return res.count === 1;
}

/**
 * Apply a confirmed payment. Idempotent and serialized:
 * - the same provider event is applied at most once (WebhookEvent table),
 * - a payment already marked SUCCEEDED is never applied again,
 * - all confirmations run under one advisory lock, so simultaneous claims are ranked in order,
 * - the final rank is calculated now, not when checkout started.
 */
export async function confirmPayment(params: { paymentId: string; providerPaymentId?: string | null; event?: ProviderEvent; now?: Date }): Promise<ConfirmOutcome> {
  const now = params.now ?? new Date();
  return withRankingLock(async (tx) => {
    if (!(await claimEvent(tx, params.event))) return { outcome: "duplicate_event" } as const;

    const payment = await tx.payment.findUnique({ where: { id: params.paymentId }, include: { listing: true } });
    if (!payment) return { outcome: "not_found" } as const;
    if (payment.status === "SUCCEEDED") return { outcome: "already_confirmed", paymentId: payment.id } as const;
    if (payment.status === "REFUNDED") return { outcome: "not_pending", status: payment.status } as const;
    // FAILED/CANCELED/EXPIRED payments can still be captured late by the provider (e.g. the
    // customer completed checkout just as it expired), so we fall through and try to apply them.

    const listing = payment.listing;
    const providerPaymentId = params.providerPaymentId ?? payment.providerPaymentId;

    const refund = async (reason: string) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: `REFUND_REQUIRED: ${reason}`, providerPaymentId, confirmedAt: now } });
      return { outcome: "refund_required", paymentId: payment.id, reason } as const;
    };

    let newTotal: number;
    if (payment.kind === "NEW_LISTING") {
      if (listing.status !== "PENDING") return refund("This link was claimed by another checkout first.");
      const otherHolder = listing.pendingPaymentId && listing.pendingPaymentId !== payment.id ? listing.pendingPaymentId : null;
      // Another checkout still holds a live reservation for this link → it wins, this one is refunded.
      if (otherHolder && listing.reservedUntil && listing.reservedUntil > now) return refund("Another checkout for this link is in progress.");
      if (otherHolder) {
        // That reservation has lapsed (its hosted checkout expired before ours was paid).
        await tx.payment.updateMany({ where: { id: otherHolder, status: "PENDING" }, data: { status: "EXPIRED", failureReason: "Reservation lapsed; another payment for this link was confirmed first." } });
      }
      newTotal = payment.targetTotal;
      // The listing row may carry details from a later (abandoned) attempt — re-apply what this payer submitted.
      const details = listing.pendingPaymentId === payment.id ? null : parseClaimDetails(payment.claimDetails);
      if (details && !(await tx.category.findUnique({ where: { id: details.categoryId }, select: { id: true } }))) details.categoryId = listing.categoryId;
      await tx.listing.update({
        where: { id: listing.id },
        data: { ...(details ?? {}), status: "ACTIVE", totalAmount: newTotal, rankedAt: now, confirmedAt: now, pendingPaymentId: null, reservedUntil: null, createdById: payment.userId ?? listing.createdById },
      });
    } else {
      if (listing.status === "REMOVED" || listing.status === "PENDING") return refund("The listing is no longer available for upgrades.");
      // Add the amount actually paid; if another upgrade landed meanwhile this still adds up correctly.
      newTotal = listing.totalAmount + payment.amount;
      await tx.listing.update({ where: { id: listing.id }, data: { totalAmount: newTotal, rankedAt: now } });
    }

    const entries = await loadBoardEntries(tx);
    const finalRank = positionFor(entries, newTotal, listing.id);
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", confirmedAt: now, providerPaymentId, finalRank, targetTotal: newTotal, failureReason: null },
    });
    return { outcome: "confirmed", paymentId: payment.id, listingId: listing.id, finalRank, newTotal } as const;
  });
}

/** Mark a pending payment as failed/cancelled/expired and release a new listing's reservation. */
export async function closePayment(params: { paymentId: string; status: "FAILED" | "CANCELED" | "EXPIRED"; reason?: string; event?: ProviderEvent; now?: Date }) {
  const now = params.now ?? new Date();
  return withRankingLock(async (tx) => {
    if (!(await claimEvent(tx, params.event))) return { outcome: "duplicate_event" as const };
    const payment = await tx.payment.findUnique({ where: { id: params.paymentId }, include: { listing: true } });
    if (!payment) return { outcome: "not_found" as const };
    if (payment.status !== "PENDING") return { outcome: "not_pending" as const, status: payment.status };
    await tx.payment.update({ where: { id: payment.id }, data: { status: params.status, failureReason: params.reason ?? null } });
    if (payment.kind === "NEW_LISTING" && payment.listing.status === "PENDING" && payment.listing.pendingPaymentId === payment.id) {
      await tx.listing.update({ where: { id: payment.listingId }, data: { pendingPaymentId: null, reservedUntil: now } });
    }
    return { outcome: "closed" as const, status: params.status };
  });
}

/** Refund a payment that couldn't be applied (Stripe) and record the result. */
export async function settleRefund(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== "FAILED" || !payment.failureReason?.startsWith("REFUND_REQUIRED")) return;
  const reason = payment.failureReason.replace(/^REFUND_REQUIRED:\s*/, "");
  if (payment.provider === "DEMO") {
    await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", failureReason: `Demo refund (no money moved): ${reason}` } });
    return;
  }
  try {
    if (!payment.providerPaymentId) throw new Error("missing payment intent");
    await refundProviderPayment(payment.providerPaymentId, payment.id);
    await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", failureReason: `Refunded automatically: ${reason}` } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.payment.update({ where: { id: paymentId }, data: { failureReason: `REFUND_REQUIRED: ${reason} (automatic refund failed: ${msg.slice(0, 120)} — refund manually in Stripe)` } });
  }
}

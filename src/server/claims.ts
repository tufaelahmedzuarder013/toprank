import "server-only";
import { z } from "zod";
import { db, withRankingLock, type Tx } from "@/server/db";
import { evaluateClaim, type ClaimIssue } from "@/lib/ranking";
import { parseTarget, safeHttpUrl, slugify, type ParsedTarget } from "@/lib/url";
import { loadBoardEntries } from "@/server/leaderboard";
import { getSettings } from "@/server/settings";
import { closePayment } from "@/server/payments";
import { createCheckoutSession, paymentMode } from "@/server/payment-provider";

const RESERVATION_MINUTES = 35;

export const claimDetailsSchema = z.object({
  target: z.string().trim().min(1, "Enter a website URL or an X handle.").max(2048),
  category: z.string().trim().min(1, "Choose a category."),
  amount: z.coerce.number({ message: "Enter an amount." }).int("Use whole dollars only."),
  name: z.string().trim().min(1, "Add a name.").max(60, "Keep the name under 60 characters."),
  description: z.string().trim().max(200, "Keep the description under 200 characters.").default(""),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  ogImageUrl: z.string().trim().max(1000).optional().nullable(),
});
export type ClaimDetails = z.infer<typeof claimDetailsSchema>;

export type CheckoutResult =
  | { ok: true; paymentId: string; url: string }
  | { ok: false; code: "INVALID_TARGET" | "INVALID_CATEGORY" | "DUPLICATE" | "BLOCKED" | "RESERVED" | "INVALID_AMOUNT" | "NOT_OWNER" | "NOT_FOUND" | "PROVIDER_ERROR"; error: string; slug?: string; issues?: ClaimIssue[] };

/** Status of a link before claiming: free, already listed, blocked or reserved by an ongoing checkout. */
export async function lookupExisting(urlKey: string, now = new Date()) {
  const existing = await db.listing.findUnique({ where: { urlKey }, select: { id: true, slug: true, name: true, status: true, pendingPaymentId: true, reservedUntil: true } });
  if (!existing) return { state: "free" as const };
  if (existing.status === "ACTIVE" || existing.status === "HIDDEN") return { state: "listed" as const, slug: existing.slug, name: existing.name, hidden: existing.status === "HIDDEN" };
  if (existing.status === "REMOVED") return { state: "blocked" as const };
  if (existing.pendingPaymentId && existing.reservedUntil && existing.reservedUntil > now) return { state: "reserved" as const, until: existing.reservedUntil };
  return { state: "free" as const };
}

async function uniqueSlug(tx: Tx, base: string, ignoreId?: string) {
  const root = slugify(base);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const hit = await tx.listing.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!hit || hit.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Validates a new claim against the live board, reserves the link and creates a
 * pending payment + hosted checkout. The rank shown is an estimate only.
 */
export async function startNewListingCheckout(input: ClaimDetails & { userId: string | null; userEmail?: string | null }, now = new Date()): Promise<CheckoutResult> {
  const parsed = parseTarget(input.target);
  if (!parsed.ok) return { ok: false, code: "INVALID_TARGET", error: parsed.error };
  const target: ParsedTarget = parsed.value;
  const category = await db.category.findFirst({ where: { slug: input.category, enabled: true }, select: { id: true } });
  if (!category) return { ok: false, code: "INVALID_CATEGORY", error: "Choose a valid category." };
  const settings = await getSettings();
  const provider = paymentMode() === "stripe" ? "STRIPE" : "DEMO";

  const reserved = await withRankingLock(async (tx): Promise<CheckoutResult | { ok: true; paymentId: string; listingId: string; previousPendingId: string | null }> => {
    const existing = await tx.listing.findUnique({ where: { urlKey: target.urlKey } });
    if (existing) {
      if (existing.status === "ACTIVE" || existing.status === "HIDDEN") {
        return { ok: false, code: "DUPLICATE", slug: existing.slug, error: "This link is already on the board. If it's yours, sign in and verify ownership to upgrade it." };
      }
      if (existing.status === "REMOVED") return { ok: false, code: "BLOCKED", error: "This link can't be listed. Contact us if you think this is a mistake." };
      if (existing.pendingPaymentId && existing.reservedUntil && existing.reservedUntil > now) {
        const mins = Math.ceil((existing.reservedUntil.getTime() - now.getTime()) / 60_000);
        return { ok: false, code: "RESERVED", error: `Someone is checking out this link right now. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.` };
      }
    }

    const evaluation = evaluateClaim({ entries: await loadBoardEntries(tx), rules: settings.rules, newTotal: input.amount });
    if (!evaluation.ok) return { ok: false, code: "INVALID_AMOUNT", error: evaluation.issues[0].message, issues: evaluation.issues };

    const data = {
      kind: target.kind,
      url: target.url,
      domain: target.domain,
      name: input.name,
      description: input.description ?? "",
      logoUrl: safeHttpUrl(input.logoUrl),
      ogImageUrl: safeHttpUrl(input.ogImageUrl),
      categoryId: category.id,
      isDemo: false,
    };
    const listing = existing
      ? await tx.listing.update({ where: { id: existing.id }, data: { ...data, slug: await uniqueSlug(tx, input.name, existing.id), createdById: input.userId ?? existing.createdById } })
      : await tx.listing.create({ data: { ...data, urlKey: target.urlKey, slug: await uniqueSlug(tx, input.name), status: "PENDING", createdById: input.userId } });

    const payment = await tx.payment.create({
      data: {
        listingId: listing.id,
        userId: input.userId,
        kind: "NEW_LISTING",
        amount: evaluation.newTotal,
        previousTotal: 0,
        targetTotal: evaluation.newTotal,
        provider,
        estimatedRank: evaluation.estimatedRank,
        claimDetails: { name: data.name, description: data.description, logoUrl: data.logoUrl, ogImageUrl: data.ogImageUrl, categoryId: data.categoryId },
        isDemo: provider === "DEMO",
      },
    });
    await tx.listing.update({ where: { id: listing.id }, data: { pendingPaymentId: payment.id, reservedUntil: new Date(now.getTime() + RESERVATION_MINUTES * 60_000) } });
    return { ok: true, paymentId: payment.id, listingId: listing.id, previousPendingId: existing?.pendingPaymentId ?? null };
  });

  if (!reserved.ok) return reserved;
  if ("previousPendingId" in reserved && reserved.previousPendingId) {
    // The earlier, expired reservation's checkout can no longer win this link.
    await closePayment({ paymentId: reserved.previousPendingId, status: "EXPIRED", reason: "Reservation expired and was taken over." }).catch(() => {});
  }
  return openCheckout(reserved.paymentId, input.userEmail);
}

/** Owner-only upgrade: charges only the difference between the current and the new total. */
export async function startUpgradeCheckout(input: { listingId: string; userId: string; userEmail?: string | null; newTotal: number }): Promise<CheckoutResult> {
  const settings = await getSettings();
  const provider = paymentMode() === "stripe" ? "STRIPE" : "DEMO";
  const created = await withRankingLock(async (tx): Promise<CheckoutResult | { ok: true; paymentId: string }> => {
    const listing = await tx.listing.findUnique({ where: { id: input.listingId } });
    if (!listing || listing.status !== "ACTIVE") return { ok: false, code: "NOT_FOUND", error: "This listing isn't active." };
    if (listing.ownerId !== input.userId || !listing.verifiedAt) {
      return { ok: false, code: "NOT_OWNER", error: "Only the verified owner can upgrade this listing. Verify ownership first." };
    }
    const evaluation = evaluateClaim({ entries: await loadBoardEntries(tx), rules: settings.rules, newTotal: input.newTotal, currentTotal: listing.totalAmount, listingId: listing.id });
    if (!evaluation.ok) return { ok: false, code: "INVALID_AMOUNT", error: evaluation.issues[0].message, issues: evaluation.issues };
    const payment = await tx.payment.create({
      data: {
        listingId: listing.id,
        userId: input.userId,
        kind: "UPGRADE",
        amount: evaluation.charge,
        previousTotal: listing.totalAmount,
        targetTotal: evaluation.newTotal,
        provider,
        estimatedRank: evaluation.estimatedRank,
        isDemo: provider === "DEMO",
      },
    });
    return { ok: true, paymentId: payment.id };
  });
  if (!created.ok) return created;
  return openCheckout(created.paymentId, input.userEmail);
}

async function openCheckout(paymentId: string, email?: string | null): Promise<CheckoutResult> {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { listing: { select: { id: true, name: true, domain: true } } } });
  try {
    const session = await createCheckoutSession({
      paymentId,
      listingId: payment.listingId,
      amount: payment.amount,
      kind: payment.kind,
      productName: payment.kind === "UPGRADE" ? `Upgrade: ${payment.listing.name} → $${payment.targetTotal.toLocaleString("en-US")} total` : `Leaderboard listing: ${payment.listing.name}`,
      description: `${payment.listing.domain} · estimated position #${payment.estimatedRank} (final position is set when payment is confirmed)`,
      customerEmail: email,
    });
    await db.payment.update({ where: { id: paymentId }, data: { providerSessionId: session.sessionId } });
    return { ok: true, paymentId, url: session.url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await closePayment({ paymentId, status: "FAILED", reason: `Checkout could not be created: ${msg.slice(0, 160)}` });
    return { ok: false, code: "PROVIDER_ERROR", error: "We couldn't open checkout. Nothing was charged — please try again." };
  }
}

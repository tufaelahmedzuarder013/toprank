import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreditCard, FlaskConical, ShieldAlert, X } from "lucide-react";
import { db } from "@/server/db";
import { paymentMode } from "@/server/payment-provider";
import { ownsCheckout } from "@/server/checkout-cookie";
import { demoCancelAction, demoDeclineAction, demoPayAction } from "@/app/actions/demo-checkout";
import { PendingButton } from "@/components/claim/pending-button";
import { ListingLogo } from "@/components/board/listing-logo";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Demo checkout", robots: { index: false } };

export default async function DemoCheckoutPage({ params }: PageProps<"/checkout/demo/[paymentId]">) {
  const { paymentId } = await params;
  if (paymentMode() !== "demo") notFound();
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { listing: { select: { name: true, domain: true, logoUrl: true, kind: true } } } });
  if (!payment || payment.provider !== "DEMO") notFound();
  if (payment.status === "SUCCEEDED") redirect(`/payment/success?payment=${payment.id}`);
  if (payment.status !== "PENDING") redirect(`/payment/cancelled?payment=${payment.id}`);
  const mine = await ownsCheckout(payment.id);

  return (
    <div className="mx-auto max-w-lg px-4 pt-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-brand-2/20 bg-brand-2-soft px-5 py-3 text-brand-2-ink">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FlaskConical className="size-4" /> Simulated checkout
          </p>
          <Badge tone="violet">No real payment</Badge>
        </div>
        <div className="p-6">
          <p className="text-xs font-bold tracking-wider text-subtle uppercase">{payment.kind === "UPGRADE" ? "Listing upgrade" : "New listing"}</p>
          <div className="mt-3 flex items-center gap-3">
            <ListingLogo src={payment.listing.logoUrl} name={payment.listing.name} kind={payment.listing.kind} size={44} />
            <div className="min-w-0">
              <p className="truncate font-display font-bold">{payment.listing.name}</p>
              <p className="truncate text-xs text-subtle">{payment.listing.domain}</p>
            </div>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            {payment.kind === "UPGRADE" && (
              <div className="flex justify-between">
                <dt className="text-muted">Current total → new total</dt>
                <dd className="font-medium tabular">
                  {formatUsd(payment.previousTotal)} → {formatUsd(payment.targetTotal)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">Estimated position</dt>
              <dd className="font-medium">#{payment.estimatedRank}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">Amount</dt>
              <dd className="font-display text-3xl font-extrabold tabular">{formatUsd(payment.amount)}</dd>
            </div>
          </dl>

          {mine ? (
            <div className="mt-6 space-y-2.5">
              <form action={demoPayAction.bind(null, payment.id)}>
                <PendingButton size="lg" className="w-full" pendingLabel="Confirming…">
                  <CreditCard /> Simulate successful payment
                </PendingButton>
              </form>
              <div className="grid grid-cols-2 gap-2.5">
                <form action={demoDeclineAction.bind(null, payment.id)}>
                  <PendingButton variant="secondary" className="w-full" pendingLabel="…">
                    <ShieldAlert /> Decline card
                  </PendingButton>
                </form>
                <form action={demoCancelAction.bind(null, payment.id)}>
                  <PendingButton variant="ghost" className="w-full" pendingLabel="…">
                    <X /> Cancel
                  </PendingButton>
                </form>
              </div>
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm">This checkout was started in another browser, so it can only be completed there.</p>
          )}
          <p className="mt-6 text-xs leading-relaxed text-subtle">
            This site is running without a payment provider, so checkout is simulated. Configure <code className="font-mono">STRIPE_SECRET_KEY</code> to use real (test-mode) Stripe Checkout. Your rank is recalculated at the moment of confirmation.
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-subtle">
        <Link href="/" className="hover:text-foreground">
          ← Back to the leaderboard
        </Link>
      </p>
    </div>
  );
}

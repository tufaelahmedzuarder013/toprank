import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleSlash, CreditCard } from "lucide-react";
import { db } from "@/server/db";
import { ownsCheckout } from "@/server/checkout-cookie";
import { expireCheckoutSession } from "@/server/payment-provider";
import { closePayment } from "@/server/payments";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false } };

export default async function PaymentCancelledPage({ searchParams }: PageProps<"/payment/cancelled">) {
  const sp = await searchParams;
  const id = typeof sp.payment === "string" ? sp.payment : null;
  let payment = id ? await db.payment.findUnique({ where: { id }, include: { listing: { select: { id: true, url: true, name: true, category: { select: { slug: true } } } } } }) : null;

  // The person who started this checkout came back without paying: release the link right away.
  if (payment?.status === "PENDING" && (await ownsCheckout(payment.id))) {
    const state = payment.providerSessionId ? await expireCheckoutSession(payment.providerSessionId) : "expired";
    if (state === "expired") {
      await closePayment({ paymentId: payment.id, status: "CANCELED", reason: "Checkout was cancelled." });
      payment = { ...payment, status: "CANCELED" };
    }
  }
  if (payment?.status === "SUCCEEDED") redirect(`/payment/success?payment=${payment.id}`);

  const failed = payment?.status === "FAILED";
  const retry = payment
    ? payment.kind === "UPGRADE"
      ? `/dashboard/listings/${payment.listing.id}`
      : `/claim?${new URLSearchParams({ target: payment.listing.url, amount: String(payment.targetTotal), category: payment.listing.category.slug })}`
    : "/claim";

  return (
    <div className="mx-auto max-w-lg px-4 pt-12 text-center sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-10">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-2 text-muted">{failed ? <CreditCard className="size-8" /> : <CircleSlash className="size-8" />}</span>
        <h1 className="mt-5 font-display text-2xl font-extrabold">{failed ? "Payment declined" : payment?.status === "EXPIRED" ? "Checkout expired" : "Checkout cancelled"}</h1>
        <p className="mt-2 text-sm text-muted">
          {failed ? "Your payment method was declined. " : ""}Nothing was charged{payment?.kind === "NEW_LISTING" ? ` and ${payment.listing.name} is free to claim again` : ""}. Your position is only reserved while checkout is open.
        </p>
        {payment?.status === "PENDING" && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">This checkout is still open in another session. It will expire automatically if it isn&apos;t completed.</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={retry}>Try again</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to the leaderboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

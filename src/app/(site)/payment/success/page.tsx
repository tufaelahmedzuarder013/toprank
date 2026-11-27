import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, Clock, PartyPopper, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { paymentMode, siteUrl } from "@/server/payment-provider";
import { syncStripeSession } from "@/server/stripe-events";
import { getSettings } from "@/server/settings";
import { AutoRefresh } from "@/components/claim/auto-refresh";
import { ListingLogo } from "@/components/board/listing-logo";
import { RankBadge } from "@/components/board/rank-badge";
import { ShareButtons } from "@/components/board/share-buttons";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment status", robots: { index: false } };

async function findPayment(sp: Record<string, string | string[] | undefined>) {
  const include = { listing: { select: { id: true, slug: true, name: true, domain: true, logoUrl: true, kind: true, status: true } } } as const;
  if (typeof sp.session_id === "string" && sp.session_id.startsWith("cs_")) {
    let p = await db.payment.findUnique({ where: { providerSessionId: sp.session_id }, include });
    // The webhook may not have arrived yet — ask Stripe directly (server-to-server).
    if (p?.status === "PENDING" && paymentMode() === "stripe") {
      try {
        await syncStripeSession(sp.session_id);
        p = await db.payment.findUnique({ where: { providerSessionId: sp.session_id }, include });
      } catch (e) {
        console.error("[stripe] success-page sync failed", e);
      }
    }
    return p;
  }
  if (typeof sp.payment === "string") return db.payment.findUnique({ where: { id: sp.payment }, include });
  return null;
}

export default async function PaymentSuccessPage({ searchParams }: PageProps<"/payment/success">) {
  const sp = await searchParams;
  const [payment, user, settings] = await Promise.all([findPayment(sp), getCurrentUser(), getSettings()]);

  if (!payment) {
    return (
      <Shell>
        <StatusIcon tone="warning" icon={CircleAlert} />
        <h1 className="mt-5 font-display text-2xl font-extrabold">We couldn&apos;t find that payment</h1>
        <p className="mt-2 text-sm text-muted">If you were charged, your listing will appear as soon as the payment is confirmed. Contact us with your receipt if anything looks wrong.</p>
        <Actions />
      </Shell>
    );
  }

  const { listing } = payment;

  if (payment.status === "PENDING") {
    return (
      <Shell>
        <AutoRefresh />
        <StatusIcon tone="brand" icon={Clock} spin />
        <h1 className="mt-5 font-display text-2xl font-extrabold">Confirming your payment…</h1>
        <p className="mt-2 text-sm text-muted">
          This usually takes a few seconds. Some payment methods take longer — your listing goes live automatically once the payment is confirmed, and you can safely close this page.
        </p>
        <ListingChip listing={listing} amount={payment.amount} />
      </Shell>
    );
  }

  if (payment.status === "SUCCEEDED") {
    const moved = payment.finalRank && payment.estimatedRank ? payment.finalRank - payment.estimatedRank : 0;
    const url = `${siteUrl()}/p/${listing.slug}`;
    return (
      <Shell wide>
        <StatusIcon tone="success" icon={PartyPopper} />
        <p className="mt-5 text-xs font-bold tracking-wider text-success uppercase">{payment.isDemo ? "Demo payment confirmed" : "Payment confirmed"}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{payment.kind === "UPGRADE" ? "Upgrade complete!" : "You're on the board!"}</h1>
        <div className="mx-auto mt-6 flex max-w-sm items-center gap-4 rounded-2xl border border-border bg-surface-2 p-4 text-left">
          {payment.finalRank && <RankBadge rank={payment.finalRank} size="lg" />}
          <ListingLogo src={listing.logoUrl} name={listing.name} kind={listing.kind} size={44} />
          <div className="min-w-0">
            <p className="truncate font-display font-bold">{listing.name}</p>
            <p className="text-sm text-muted">
              Total <strong className="text-foreground tabular">{formatUsd(payment.targetTotal)}</strong>
            </p>
          </div>
        </div>
        {payment.finalRank && (
          <p className="mx-auto mt-4 flex max-w-md items-start justify-center gap-2 text-sm text-muted">
            {moved > 0 ? <TrendingDown className="mt-0.5 size-4 shrink-0 text-warning" /> : <TrendingUp className="mt-0.5 size-4 shrink-0 text-success" />}
            <span>
              Confirmed at <strong className="text-foreground">#{payment.finalRank}</strong> on the all-time board
              {moved > 0 ? ` — ${moved} below the estimate because someone else paid while you were checking out.` : moved < 0 ? ` — ${-moved} above the estimate.` : ", exactly as estimated."}
            </span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={`/p/${listing.slug}`}>
              View your listing <ArrowRight />
            </Link>
          </Button>
          <ShareButtons url={url} text={`We're #${payment.finalRank} on ${settings.brand.name} 🚀`} />
        </div>
        {payment.kind === "NEW_LISTING" && (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border p-4 text-left text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="size-4 text-brand-2" /> Want to climb later?
            </p>
            <p className="mt-1 text-muted">
              {user ? "Verify ownership from your dashboard to unlock upgrades — you'll only ever pay the difference." : "Create a free account and verify ownership to unlock upgrades — you'll only ever pay the difference."}
            </p>
            <Link href={user ? `/dashboard/listings/${listing.id}` : `/register?next=${encodeURIComponent(`/dashboard/listings/${listing.id}`)}`} className="mt-2 inline-block font-semibold text-brand-ink hover:underline">
              {user ? "Verify ownership →" : "Create an account →"}
            </Link>
          </div>
        )}
      </Shell>
    );
  }

  const refunded = payment.status === "REFUNDED" || payment.failureReason?.startsWith("REFUND_REQUIRED");
  return (
    <Shell>
      <StatusIcon tone="warning" icon={refunded ? RotateCcw : CircleAlert} />
      <h1 className="mt-5 font-display text-2xl font-extrabold">{refunded ? "This payment was refunded" : "This payment didn't go through"}</h1>
      <p className="mt-2 text-sm text-muted">
        {refunded
          ? payment.status === "REFUNDED"
            ? `We couldn't apply it — ${payment.failureReason?.replace(/^(Demo refund \(no money moved\)|Refunded automatically):\s*/, "") ?? "the listing was no longer available"}. The full amount has been returned.`
            : "We couldn't apply it because the link was claimed by another checkout first. A refund is being processed."
          : "Nothing was charged. You can try again whenever you're ready."}
      </p>
      <Actions />
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto px-4 pt-12 text-center sm:px-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-10">{children}</div>
    </div>
  );
}

function StatusIcon({ icon: Icon, tone, spin }: { icon: React.ComponentType<{ className?: string }>; tone: "success" | "warning" | "brand"; spin?: boolean }) {
  const cls = tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-brand-soft text-brand-ink";
  return (
    <span className={`mx-auto grid size-16 place-items-center rounded-2xl ${cls}`}>
      <Icon className={`size-8 ${spin ? "animate-pulse" : ""}`} />
    </span>
  );
}

function ListingChip({ listing, amount }: { listing: { name: string; domain: string; logoUrl: string | null; kind: "WEBSITE" | "X_PROFILE" }; amount: number }) {
  return (
    <div className="mx-auto mt-6 flex max-w-xs items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 text-left">
      <ListingLogo src={listing.logoUrl} name={listing.name} kind={listing.kind} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{listing.name}</p>
        <p className="truncate text-xs text-subtle">{listing.domain}</p>
      </div>
      <p className="font-display font-bold tabular">{formatUsd(amount)}</p>
    </div>
  );
}

function Actions() {
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <Button asChild>
        <Link href="/claim">Try again</Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="/">Back to the leaderboard</Link>
      </Button>
    </div>
  );
}

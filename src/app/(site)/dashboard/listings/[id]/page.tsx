import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, EyeOff, History, Pencil, ShieldCheck, TrendingUp } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getBoardEntries, getEnabledCategories } from "@/server/leaderboard";
import { getOrCreateOwnershipClaim } from "@/server/ownership";
import { getSettings } from "@/server/settings";
import { paymentMode } from "@/server/payment-provider";
import { updateOwnListingAction } from "@/app/actions/owner";
import { rankEntries } from "@/lib/ranking";
import { VERIFY_FILE, VERIFY_KEY } from "@/lib/verification";
import { ListingLogo } from "@/components/board/listing-logo";
import { VerifyPanel } from "@/components/dashboard/verify-panel";
import { UpgradeForm } from "@/components/dashboard/upgrade-form";
import { EditListingForm } from "@/components/dashboard/edit-listing-form";
import { PaymentStatus, StatCard } from "@/components/dashboard/status";
import { Card } from "@/components/ui/card";
import { formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage listing", robots: { index: false } };

export default async function ManageListingPage({ params }: PageProps<"/dashboard/listings/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/listings/${id}`);
  const listing = await db.listing.findUnique({ where: { id }, include: { category: true } });
  if (!listing || listing.status === "PENDING") notFound();
  const verified = listing.ownerId === user.id && Boolean(listing.verifiedAt);
  if (listing.status === "REMOVED" && !verified) notFound();

  const [settings, entries, categories] = await Promise.all([getSettings(), getBoardEntries(), getEnabledCategories()]);
  const rank = rankEntries(entries).find((e) => e.id === listing.id)?.rank ?? null;
  const host = listing.domain.split("/")[0];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <ListingLogo src={listing.logoUrl} name={listing.name} kind={listing.kind} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
            {listing.name}
            {verified && <BadgeCheck className="size-5 text-brand-2" aria-label="Verified owner" />}
          </h1>
          <p className="text-sm text-muted">
            {listing.domain} ·{" "}
            {listing.status === "ACTIVE" ? (
              <Link href={`/p/${listing.slug}`} className="font-semibold text-brand-ink hover:underline">
                View public page
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <EyeOff className="size-3.5" /> {listing.status === "HIDDEN" ? "Hidden by a moderator" : "Removed by a moderator"}
              </span>
            )}
          </p>
        </div>
      </div>

      {verified ? (
        <OwnerView listing={listing} rank={rank} entries={entries.map((e) => ({ id: e.id, total: e.total, rankedAt: new Date(e.rankedAt).getTime() }))} categories={categories} settings={settings} />
      ) : (
        <Card className="mt-8 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-sans text-lg font-bold">
            <ShieldCheck className="size-5 text-brand-2" /> Verify that you own this listing
          </h2>
          <p className="mt-1 text-sm text-muted">
            Only the verified owner can edit or upgrade a listing.
            {listing.ownerId && listing.ownerId !== user.id && listing.kind === "WEBSITE" && " Another account is currently verified — proving control of the domain transfers ownership to you."}
          </p>
          <div className="mt-5">
            <VerifyPanel
              listingId={listing.id}
              kind={listing.kind}
              host={listing.kind === "X_PROFILE" ? listing.domain : host}
              siteUrl={listing.url}
              token={(await getOrCreateOwnershipClaim(listing.id, user.id)).token}
              verifyKey={VERIFY_KEY}
              verifyFile={VERIFY_FILE}
              demo={paymentMode() === "demo"}
              manualRequested={Boolean(await db.ownershipClaim.findFirst({ where: { listingId: listing.id, userId: user.id, method: "MANUAL", verifiedAt: null }, select: { id: true } }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

async function OwnerView({
  listing,
  rank,
  entries,
  categories,
  settings,
}: {
  listing: { id: string; name: string; description: string; logoUrl: string | null; categoryId: string; totalAmount: number; clicks: number; status: string };
  rank: number | null;
  entries: { id: string; total: number; rankedAt: number }[];
  categories: { id: string; name: string }[];
  settings: Awaited<ReturnType<typeof getSettings>>;
}) {
  const payments = await db.payment.findMany({ where: { listingId: listing.id }, orderBy: { createdAt: "desc" }, take: 25 });
  const paid = payments.filter((p) => p.status === "SUCCEEDED");
  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="All-time rank" value={rank ? `#${rank}` : "—"} hint={`of ${entries.length}`} />
        <StatCard label="Total" value={formatUsd(listing.totalAmount)} />
        <StatCard label="Clicks" value={formatNumber(listing.clicks)} />
        <StatCard label="Payments" value={paid.length} />
      </div>

      {listing.status === "ACTIVE" && rank && (
        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-sans text-lg font-bold">
            <TrendingUp className="size-5 text-brand" /> Upgrade
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted">Raise your total to climb. You only pay the difference between your current and new total.</p>
          <UpgradeForm listingId={listing.id} currentTotal={listing.totalAmount} currentRank={rank} entries={entries} rules={settings.rules} demo={paymentMode() === "demo"} />
        </Card>
      )}

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-sans text-lg font-bold">
          <Pencil className="size-5 text-subtle" /> Listing details
        </h2>
        <EditListingForm listing={{ id: listing.id, name: listing.name, description: listing.description, logoUrl: listing.logoUrl, categoryId: listing.categoryId }} categories={categories.map((c) => ({ id: c.id, name: c.name }))} action={updateOwnListingAction} />
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 font-sans text-lg font-bold">
          <History className="size-5 text-subtle" /> Payments
        </h2>
        {payments.length ? (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="w-24 text-muted">{p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                <span className="flex-1 font-medium">
                  {p.kind === "UPGRADE" ? "Upgrade" : "New listing"} · {formatUsd(p.amount)}
                  {p.finalRank ? <span className="text-muted"> · #{p.finalRank}</span> : null}
                </span>
                <PaymentStatus status={p.status} failureReason={p.failureReason} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-muted">No payments yet.</p>
        )}
      </Card>
    </div>
  );
}

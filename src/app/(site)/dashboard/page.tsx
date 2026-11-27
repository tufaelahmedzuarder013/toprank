import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ChevronRight, Inbox, Plus, ShieldQuestion } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { getBoardEntries } from "@/server/leaderboard";
import { rankEntries } from "@/lib/ranking";
import { ListingLogo } from "@/components/board/listing-logo";
import { EmptyState } from "@/components/board/board-ui";
import { ListingStatus, PaymentStatus, StatCard } from "@/components/dashboard/status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatUsd } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [listings, payments, claims, entries] = await Promise.all([
    db.listing.findMany({
      where: { OR: [{ ownerId: user.id }, { createdById: user.id }, { ownershipClaims: { some: { userId: user.id } } }], status: { not: "PENDING" } },
      orderBy: { totalAmount: "desc" },
      select: { id: true, slug: true, name: true, domain: true, logoUrl: true, kind: true, status: true, totalAmount: true, clicks: true, ownerId: true, verifiedAt: true },
    }),
    db.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { listing: { select: { slug: true, name: true, status: true } } } }),
    db.ownershipClaim.findMany({ where: { userId: user.id }, select: { listingId: true, method: true, verifiedAt: true } }),
    getBoardEntries(),
  ]);
  const ranks = new Map(rankEntries(entries).map((e) => [e.id, e.rank]));
  const owned = listings.filter((l) => l.ownerId === user.id && l.verifiedAt);
  const spent = payments.filter((p) => p.status === "SUCCEEDED").reduce((s, p) => s + p.amount, 0);
  const clicks = owned.reduce((s, l) => s + l.clicks, 0);
  const claimMap = new Map(claims.map((c) => [c.listingId, c]));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-brand-ink uppercase">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
        </div>
        <Button asChild>
          <Link href="/claim">
            <Plus /> New listing
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Verified listings" value={owned.length} hint={`${listings.length} linked to you`} />
        <StatCard label="Best rank" value={owned.length ? `#${Math.min(...owned.map((l) => ranks.get(l.id) ?? Infinity))}` : "—"} hint="all-time board" />
        <StatCard label="Clicks sent" value={formatNumber(clicks)} hint="to your verified listings" />
        <StatCard label="Total paid" value={formatUsd(spent)} hint="confirmed payments" />
      </div>

      <section className="mt-10" aria-labelledby="your-listings">
        <h2 id="your-listings" className="font-sans text-lg font-bold">
          Your listings
        </h2>
        {listings.length ? (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            {listings.map((l) => {
              const verified = l.ownerId === user.id && l.verifiedAt;
              const claim = claimMap.get(l.id);
              return (
                <li key={l.id}>
                  <Link href={`/dashboard/listings/${l.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-2">
                    <ListingLogo src={l.logoUrl} name={l.name} kind={l.kind} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{l.name}</span>
                        {l.status !== "ACTIVE" && <ListingStatus status={l.status} />}
                        {verified ? (
                          <Badge tone="violet">
                            <BadgeCheck /> Verified
                          </Badge>
                        ) : claim?.method === "MANUAL" ? (
                          <Badge tone="warning">Review requested</Badge>
                        ) : (
                          <Badge tone="outline">
                            <ShieldQuestion /> Not verified
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-subtle">{l.domain}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-display font-bold tabular">{formatUsd(l.totalAmount)}</p>
                      <p className="text-xs text-subtle">{ranks.get(l.id) ? `#${ranks.get(l.id)} all-time` : "not ranked"}</p>
                    </div>
                    <ChevronRight className="size-4 text-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title="No listings yet" className="mt-3">
            <p>Claim a rank, or open an existing listing and verify you own it to manage it here.</p>
            <Button asChild className="mt-4">
              <Link href="/claim">Claim a rank</Link>
            </Button>
          </EmptyState>
        )}
      </section>

      <section className="mt-10" aria-labelledby="payments">
        <h2 id="payments" className="font-sans text-lg font-bold">
          Payment history
        </h2>
        {payments.length ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Listing</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Rank</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</td>
                    <td className="px-4 py-3 font-medium">{p.listing.status === "ACTIVE" ? <Link href={`/p/${p.listing.slug}`} className="hover:underline">{p.listing.name}</Link> : p.listing.name}</td>
                    <td className="px-4 py-3 text-muted">{p.kind === "UPGRADE" ? "Upgrade" : "New listing"}{p.isDemo ? " (demo)" : ""}</td>
                    <td className="px-4 py-3 font-semibold tabular">{formatUsd(p.amount)}</td>
                    <td className="px-4 py-3 text-muted">{p.finalRank ? `#${p.finalRank}` : p.estimatedRank ? `est. #${p.estimatedRank}` : "—"}</td>
                    <td className="px-4 py-3">
                      <PaymentStatus status={p.status} failureReason={p.failureReason} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No payments yet. Payments made while signed in appear here.</p>
        )}
      </section>
    </div>
  );
}

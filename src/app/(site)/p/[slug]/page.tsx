import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeCheck, CalendarDays, ChevronRight, Hash, History, Info, MousePointerClick, ShieldCheck, TrendingUp, Trophy } from "lucide-react";
import { getListingDetail } from "@/server/leaderboard";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/auth";
import { siteUrl } from "@/server/payment-provider";
import { ListingLogo } from "@/components/board/listing-logo";
import { RankBadge } from "@/components/board/rank-badge";
import { ShareButtons } from "@/components/board/share-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatNumber, formatUsd } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const detail = await getListingDetail((await params).slug);
  if (!detail) return { title: "Listing not found", robots: { index: false } };
  const { listing } = detail;
  const description = listing.description || `${listing.name} is #${detail.allTimeRank} on the leaderboard.`;
  return {
    title: `${listing.name} — #${detail.allTimeRank} on the leaderboard`,
    description,
    alternates: { canonical: `/p/${listing.slug}` },
    openGraph: { title: listing.name, description, url: `/p/${listing.slug}`, images: listing.ogImageUrl ? [{ url: listing.ogImageUrl }] : undefined },
  };
}

export default async function ListingPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const [detail, settings, user] = await Promise.all([getListingDetail(slug), getSettings(), getCurrentUser()]);
  if (!detail) notFound();
  const { listing } = detail;
  const isOwner = Boolean(user && detail.ownerId === user.id && listing.verified);
  const url = `${siteUrl()}/p/${listing.slug}`;
  const nextUp = detail.nextUp;

  const stats = [
    { icon: Trophy, label: "All-time rank", value: detail.allTimeRank ? `#${detail.allTimeRank}` : "—", sub: `of ${formatNumber(detail.boardCount)}` },
    { icon: Hash, label: `Rank in ${listing.category.name}`, value: detail.categoryRank ? `#${detail.categoryRank}` : "—", sub: `of ${formatNumber(detail.categoryCount)}` },
    { icon: CalendarDays, label: "Today", value: detail.todayRank ? `#${detail.todayRank}` : "—", sub: detail.todayAmount ? `${formatUsd(detail.todayAmount)} today` : "no spend today" },
    { icon: MousePointerClick, label: "Clicks", value: formatNumber(listing.clicks), sub: "visits sent" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-subtle">
        <Link href="/" className="hover:text-foreground">
          Leaderboard
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/categories/${listing.category.slug}`} className="hover:text-foreground">
          {listing.category.name}
        </Link>
        <ChevronRight className="size-3" />
        <span className="truncate text-muted" aria-current="page">
          {listing.name}
        </span>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card className="relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-brand/15 blur-3xl" />
            <div className="relative p-5 sm:p-7">
              <div className="flex flex-wrap items-start gap-4 sm:gap-5">
                <ListingLogo src={listing.logoUrl} name={listing.name} kind={listing.kind} size={72} className="shadow-md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl font-extrabold tracking-tight break-words sm:text-3xl">{listing.name}</h1>
                    {listing.verified && (
                      <Badge tone="violet" size="md">
                        <BadgeCheck /> Verified owner
                      </Badge>
                    )}
                    {listing.isDemo && (
                      <Badge tone="violet" size="md">
                        Demo listing
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <Link href={`/categories/${listing.category.slug}`} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
                      <CategoryIcon name={listing.category.icon} className="size-4" /> {listing.category.name}
                    </Link>
                    <span className="truncate">{listing.domain}</span>
                  </p>
                </div>
                {detail.allTimeRank && <RankBadge rank={detail.allTimeRank} size="lg" className="hidden sm:grid" />}
              </div>
              {listing.description && <p className="mt-5 text-[15px] leading-relaxed text-foreground/90">{listing.description}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button asChild>
                  <a href={`/go/${listing.slug}`} target="_blank" rel="sponsored nofollow noopener">
                    Visit {listing.kind === "X_PROFILE" ? "profile" : "website"} <ArrowUpRight />
                  </a>
                </Button>
                <ShareButtons url={url} text={`${listing.name} is #${detail.allTimeRank} on ${settings.brand.name}`} />
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/categories/${listing.category.slug}`}>
                    <CategoryIcon name={listing.category.icon} /> Explore {listing.category.name}
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-subtle">
                  <s.icon className="size-3.5" /> <span className="truncate">{s.label}</span>
                </dt>
                <dd className="mt-2 font-display text-2xl font-extrabold tabular">{s.value}</dd>
                <dd className="text-xs text-subtle">{s.sub}</dd>
              </div>
            ))}
          </dl>

          <Card>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="flex items-center gap-2 font-sans text-[15px] font-bold">
                <History className="size-4 text-subtle" /> Ranking activity
              </h2>
              <span className="text-xs text-subtle">Listed {listing.addedAt ? timeAgo(listing.addedAt) : "—"}</span>
            </div>
            {detail.history.length ? (
              <ol className="divide-y divide-border">
                {detail.history.map((h) => (
                  <li key={h.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${h.kind === "UPGRADE" ? "bg-brand-2-soft text-brand-2-ink" : "bg-brand-soft text-brand-ink"}`}>
                      {h.kind === "UPGRADE" ? <TrendingUp className="size-4" /> : <Trophy className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{h.kind === "UPGRADE" ? `Added ${formatUsd(h.amount)}` : `Joined with ${formatUsd(h.amount)}`}</span>
                      <span className="block text-xs text-subtle">
                        Total {formatUsd(h.targetTotal)}
                        {h.finalRank ? ` · ranked #${h.finalRank} at confirmation` : ""}
                        {h.isDemo ? " · demo payment" : ""}
                      </span>
                    </span>
                    <time className="shrink-0 text-xs text-subtle" dateTime={h.confirmedAt ?? undefined}>
                      {h.confirmedAt ? timeAgo(h.confirmedAt) : ""}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="px-5 py-6 text-sm text-muted">No payment history yet.</p>
            )}
          </Card>

          {detail.related.length > 0 && (
            <section aria-labelledby="related">
              <h2 id="related" className="font-sans text-[15px] font-bold">
                More in {listing.category.name}
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {detail.related.map((r) => (
                  <li key={r.id}>
                    <Link href={`/p/${r.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-border-strong">
                      <RankBadge rank={r.rank} size="sm" />
                      <ListingLogo src={r.logoUrl} name={r.name} kind={r.kind} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.name}</span>
                        <span className="block truncate text-xs text-subtle">{r.description || r.domain}</span>
                      </span>
                      <span className="font-display text-sm font-bold tabular">{formatUsd(r.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4" aria-label="Ranking details">
          <Card className="p-5">
            <p className="text-xs font-semibold text-subtle">Total paid (all-time)</p>
            <p className="mt-1 font-display text-4xl font-extrabold tracking-tight tabular">{formatUsd(listing.totalAmount)}</p>
            {nextUp ? (
              <div className="mt-4 rounded-xl border border-border bg-surface-2 p-3.5 text-sm">
                <p className="font-semibold">
                  Reach #{nextUp.rank} with {formatUsd(nextUp.total)}
                </p>
                <p className="mt-0.5 text-xs text-muted">That&apos;s {formatUsd(nextUp.extra)} more than the current total.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-[color-mix(in_oklab,var(--gold)_40%,var(--border))] bg-[color-mix(in_oklab,var(--gold)_8%,var(--surface))] p-3.5 text-sm font-semibold">This listing holds #1.</div>
            )}
            {isOwner ? (
              <Button asChild className="mt-4 w-full">
                <Link href={`/dashboard/listings/${listing.id}`}>
                  <TrendingUp /> Claim a higher rank
                </Link>
              </Button>
            ) : (
              <div className="mt-4 space-y-2">
                <Button asChild variant="secondary" className="w-full">
                  <Link href={`/dashboard/listings/${listing.id}`}>
                    <ShieldCheck /> Is this yours? Verify ownership
                  </Link>
                </Button>
                <p className="text-xs leading-relaxed text-subtle">Only the verified owner can upgrade or edit a listing. Nobody can take it over by paying the difference.</p>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold">Want a spot like this?</p>
            <p className="mt-1 text-xs text-muted">List your own product at the position its total supports.</p>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href={`/claim?amount=${detail.allTimeRank === 1 ? listing.totalAmount + settings.rules.topIncrement : listing.totalAmount + settings.rules.overtakeIncrement}&category=${listing.category.slug}`}>
                Claim #{detail.allTimeRank} for {formatUsd(detail.allTimeRank === 1 ? listing.totalAmount + settings.rules.topIncrement : listing.totalAmount + settings.rules.overtakeIncrement)}
              </Link>
            </Button>
          </Card>
          <p className="flex gap-2 rounded-2xl border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-subtle" />
            <span>
              <strong className="text-foreground">Paid placement.</strong> {settings.disclosure}
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Activity, ArrowRight, CalendarClock, Crown, Gem, Sparkles, TrendingUp } from "lucide-react";
import type { ActivityItem, ListingCard } from "@/server/leaderboard";
import type { SiteSettingsData } from "@/config/defaults";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResetCountdown } from "@/components/ui/countdown";
import { ListingLogo } from "@/components/board/listing-logo";
import { RankBadge } from "@/components/board/rank-badge";
import { formatUsd, plural } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

function SectionTitle({ icon: Icon, children, href, linkLabel }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <h2 className="flex items-center gap-2 font-sans text-[13px] font-bold">
        <Icon className="size-4 text-subtle" />
        {children}
      </h2>
      {href && (
        <Link href={href} className="text-xs font-semibold text-brand-ink hover:underline">
          {linkLabel ?? "See all"}
        </Link>
      )}
    </div>
  );
}

export function CurrentTopCard({ top, topIncrement, boardCount, volume }: { top: ListingCard | null; topIncrement: number; boardCount: number; volume: number }) {
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--gold)_16%,transparent),transparent)]" />
      <div className="relative p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">
          <Crown className="size-3.5 text-[var(--gold)]" /> Current #1
        </p>
        {top ? (
          <>
            <Link href={`/p/${top.slug}`} className="mt-3 flex items-center gap-3 rounded-xl">
              <ListingLogo src={top.logoUrl} name={top.name} kind={top.kind} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-display font-bold">{top.name}</span>
                <span className="block truncate text-xs text-subtle">{top.domain}</span>
              </span>
            </Link>
            <p className="mt-3 font-display text-3xl font-extrabold tracking-tight tabular">{formatUsd(top.totalAmount)}</p>
            <Link
              href={`/claim?amount=${top.totalAmount + topIncrement}`}
              className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-solid text-sm font-semibold text-brand-fg transition hover:brightness-105"
            >
              <TrendingUp className="size-4" /> Take #1 for {formatUsd(top.totalAmount + topIncrement)}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">The top spot is open. Be the first on the board.</p>
            <Link href="/claim" className="mt-3 flex h-10 items-center justify-center rounded-xl bg-brand-solid text-sm font-semibold text-brand-fg">
              Claim #1
            </Link>
          </>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
          <div>
            <dt className="text-[11px] text-subtle">Listings</dt>
            <dd className="font-display font-bold tabular">{boardCount.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-subtle">Total committed</dt>
            <dd className="font-display font-bold tabular">{formatUsd(volume)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

export function TodayTopCard({ items, volume }: { items: ListingCard[]; volume: number }) {
  return (
    <Card>
      <SectionTitle icon={CalendarClock} href="/today" linkLabel="Today's board">
        Today&apos;s top
      </SectionTitle>
      <p className="flex items-center justify-between px-4 text-xs text-subtle">
        <span>{formatUsd(volume)} spent today</span>
        <span>
          Resets in <ResetCountdown className="font-semibold text-muted" compact />
        </span>
      </p>
      {items.length ? (
        <ol className="mt-2 px-2 pb-2">
          {items.map((i) => (
            <li key={i.id}>
              <Link href={`/p/${i.slug}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
                <RankBadge rank={i.rank} size="sm" />
                <ListingLogo src={i.logoUrl} name={i.name} kind={i.kind} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{i.name}</span>
                <span className="font-display text-sm font-bold tabular">{formatUsd(i.amount)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 pt-3 pb-4 text-sm text-muted">
          No payments yet today — the first claim takes #1.{" "}
          <Link href="/claim" className="font-semibold text-brand-ink hover:underline">
            Claim it
          </Link>
        </p>
      )}
    </Card>
  );
}

export function ActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <SectionTitle icon={Activity}>Recent activity</SectionTitle>
      {items.length ? (
        <ul className="px-2 pb-2">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/p/${a.listing.slug}`} className="flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
                <ListingLogo src={a.listing.logoUrl} name={a.listing.name} kind={a.listing.kind} size={28} className="mt-0.5" />
                <span className="min-w-0 flex-1 text-[13px] leading-snug">
                  <span className="font-semibold">{a.listing.name}</span>{" "}
                  <span className="text-muted">
                    {a.kind === "UPGRADE" ? `added ${formatUsd(a.amount)}` : `joined with ${formatUsd(a.amount)}`}
                    {a.finalRank ? ` · #${a.finalRank}` : ""}
                  </span>
                  <span className="block text-[11px] text-subtle">{a.confirmedAt ? timeAgo(a.confirmedAt) : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 pt-1 pb-4 text-sm text-muted">Nothing yet. Activity appears here as payments are confirmed.</p>
      )}
    </Card>
  );
}

export function FeaturedCard({ featured, items }: { featured: SiteSettingsData["featured"]; items: ListingCard[] }) {
  if (!featured.enabled || !items.length) return null;
  return (
    <Card className="border-brand-2/30">
      <SectionTitle icon={Gem}>{featured.title || "Featured"}</SectionTitle>
      {featured.description && <p className="px-4 text-xs text-subtle">{featured.description}</p>}
      <ul className="mt-2 space-y-1 px-2 pb-2">
        {items.map((i) => (
          <li key={i.id}>
            <Link href={`/p/${i.slug}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2">
              <ListingLogo src={i.logoUrl} name={i.name} kind={i.kind} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{i.name}</span>
                <span className="block truncate text-xs text-subtle">{i.description || i.domain}</span>
              </span>
              <ArrowRight className="size-4 text-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SeasonalCard({ seasonal }: { seasonal: SiteSettingsData["seasonal"] }) {
  if (!seasonal.enabled) return null;
  return (
    <Link href={seasonal.href} className="group relative block overflow-hidden rounded-2xl p-4 text-white shadow-md">
      <span aria-hidden className="brand-gradient absolute inset-0" />
      <span aria-hidden className="absolute inset-0 bg-black/25" />
      <span className="relative block">
        {seasonal.badge && (
          <Badge className="border-white/30 bg-white/15 text-white">
            <Sparkles /> {seasonal.badge}
          </Badge>
        )}
        <span className="mt-2 block font-display text-lg font-extrabold">{seasonal.title}</span>
        <span className="mt-1 block text-sm text-white/90">{seasonal.description}</span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
          Learn more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

export function StatLine({ count, label }: { count: number; label: string }) {
  return <span className="text-xs text-subtle">{plural(count, label)}</span>;
}

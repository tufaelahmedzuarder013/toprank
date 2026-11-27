import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, Trophy } from "lucide-react";
import { getArchiveDay } from "@/server/leaderboard";
import { addDays, formatDayLabel, parseDateKey, toDateKey } from "@/lib/time";
import { getSettings } from "@/server/settings";
import { BoardTabs, EmptyState } from "@/components/board/board-ui";
import { ListingLogo } from "@/components/board/listing-logo";
import { RankBadge } from "@/components/board/rank-badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Badge } from "@/components/ui/badge";
import { cn, formatUsd } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/daily/[date]">): Promise<Metadata> {
  const { date } = await params;
  if (!parseDateKey(date)) return {};
  return { title: `Leaderboard for ${formatDayLabel(date)}`, description: `Final daily ranking for ${formatDayLabel(date)} (UTC).`, alternates: { canonical: `/daily/${date}` } };
}

export default async function ArchiveDayPage({ params }: PageProps<"/daily/[date]">) {
  const { date } = await params;
  if (!parseDateKey(date)) notFound();
  const today = toDateKey();
  if (date >= today) redirect("/today");
  const [day, settings] = await Promise.all([getArchiveDay(date), getSettings()]);
  if (!day) notFound();
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const volume = day.entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <BoardTabs active="archive" />
      <section className="mt-4 rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-subtle uppercase">
              <Lock className="size-3.5" /> Final · frozen at midnight UTC
            </p>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{formatDayLabel(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h1>
            <p className="mt-1 text-sm text-muted">
              {day.entries.length} ranked · {formatUsd(volume)} spent that day
            </p>
          </div>
          <nav aria-label="Change day" className="flex gap-2">
            <Link href={`/daily/${prev}`} className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2">
              <ChevronLeft className="size-4" /> <span className="hidden sm:inline">Previous</span>
            </Link>
            <Link href={next >= today ? "/today" : `/daily/${next}`} className="inline-flex h-10 items-center gap-1 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2">
              <span className="hidden sm:inline">{next >= today ? "Today" : "Next"}</span> <ChevronRight className="size-4" />
            </Link>
          </nav>
        </div>
      </section>

      {day.entries.length ? (
        <ol className="stagger mt-6 space-y-2">
          {day.entries.map((e, i) => (
            <li key={e.listingId} style={{ "--i": i } as React.CSSProperties} className={cn("flex items-center gap-3 rounded-2xl border bg-surface p-3 sm:gap-4 sm:p-4", e.rank === 1 ? "border-[color-mix(in_oklab,var(--gold)_45%,var(--border))]" : "border-border")}>
              <RankBadge rank={e.rank} />
              <ListingLogo src={e.logoUrl} name={e.name} kind={e.kind} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5">
                  <Link href={`/p/${e.slug}`} className="truncate font-display text-[15px] font-bold hover:underline">
                    {e.name}
                  </Link>
                  {e.isDemo && <Badge tone="violet">Demo</Badge>}
                </p>
                <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-subtle">
                  <CategoryIcon name={e.category.icon} className="size-3.5 shrink-0" /> {e.category.name} · {e.domain}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-extrabold tabular">{formatUsd(e.amount)}</p>
                <p className="text-[11px] text-subtle">that day</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon={Trophy} title="No ranked listings this day" className="mt-6">
          <p>No payments were confirmed on this date.</p>
        </EmptyState>
      )}
      <p className="mt-6 text-center text-xs text-subtle">{settings.disclosure}</p>
    </div>
  );
}

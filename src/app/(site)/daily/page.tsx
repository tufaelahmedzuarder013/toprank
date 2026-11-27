import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, CalendarSearch, Crown } from "lucide-react";
import { getActiveDays, getArchiveDay } from "@/server/leaderboard";
import { addDays, formatDayLabel, parseDateKey, toDateKey } from "@/lib/time";
import { BoardTabs, EmptyState } from "@/components/board/board-ui";
import { ListingLogo } from "@/components/board/listing-logo";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Daily archive",
  description: "Every past day's final leaderboard, frozen at midnight UTC.",
  alternates: { canonical: "/daily" },
};

export default async function DailyArchivePage({ searchParams }: PageProps<"/daily">) {
  const sp = await searchParams;
  const today = toDateKey();
  if (typeof sp.date === "string" && parseDateKey(sp.date)) redirect(sp.date >= today ? "/today" : `/daily/${sp.date}`);

  const days = (await getActiveDays(120)).filter((d) => d < today);
  const recent = await Promise.all(days.slice(0, 14).map(async (d) => ({ date: d, day: await getArchiveDay(d) })));
  const minDate = days.at(-1) ?? addDays(today, -1);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <section className="rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-brand-2-ink uppercase">
              <Archive className="size-4" /> Daily archive
            </p>
            <h1 className="mt-2 font-display text-[26px] leading-tight font-extrabold tracking-tight sm:text-[32px]">Every day&apos;s final ranking</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">Each UTC day is frozen at midnight, so past results never change. Pick a date or browse recent days.</p>
          </div>
          <form action="/daily" className="flex w-full items-end gap-2 sm:w-auto">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold text-muted sm:flex-none">
              Jump to a date (UTC)
              <input
                type="date"
                name="date"
                required
                min={minDate}
                max={addDays(today, -1)}
                defaultValue={addDays(today, -1)}
                className="h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground shadow-sm focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
              />
            </label>
            <Button type="submit" variant="secondary" className="h-11">
              <CalendarSearch /> View
            </Button>
          </form>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <BoardTabs active="archive" />
        <p className="text-xs text-subtle">{days.length} days with activity in the last 120 days</p>
      </div>

      {recent.length ? (
        <ul className="stagger mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map(({ date, day }, i) => {
            const winner = day?.entries[0];
            const volume = day?.entries.reduce((s, e) => s + e.amount, 0) ?? 0;
            return (
              <li key={date} style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/daily/${date}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[15px] font-bold">{formatDayLabel(date, { weekday: "long", month: "short", day: "numeric" })}</span>
                    <span className="text-xs text-subtle">{date.slice(0, 4)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {day?.entries.length ?? 0} ranked · {formatUsd(volume)} spent
                  </p>
                  {winner ? (
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[color-mix(in_oklab,var(--gold)_9%,var(--surface-2))] px-3 py-2.5">
                      <Crown className="size-4 shrink-0 text-[var(--gold)]" aria-label="Winner" />
                      <ListingLogo src={winner.logoUrl} name={winner.name} kind={winner.kind} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{winner.name}</span>
                      <span className="font-display text-sm font-bold tabular">{formatUsd(winner.amount)}</span>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-subtle">No ranked listings</p>
                  )}
                  <span className="mt-3 text-xs font-semibold text-brand-ink group-hover:underline">Full ranking →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Archive} title="No past days yet" className="mt-4">
          <p>Once a day with payments ends, its final ranking appears here.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/today">See today&apos;s board</Link>
          </Button>
        </EmptyState>
      )}
    </div>
  );
}

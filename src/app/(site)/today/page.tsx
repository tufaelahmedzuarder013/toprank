import type { Metadata } from "next";
import Link from "next/link";
import { Sunrise } from "lucide-react";
import { getSettings } from "@/server/settings";
import { getAllTimeBoard, getBoardEntries, getDailyBoard, getRecentActivity, outbidHref } from "@/server/leaderboard";
import { toDateKey, addDays } from "@/lib/time";
import { CategoryBar } from "@/components/layout/category-bar";
import { LeaderboardRow } from "@/components/board/leaderboard-row";
import { AnimatedRows, LiveRefresh } from "@/components/board/animated-rows";
import { BoardTabs, EmptyState } from "@/components/board/board-ui";
import { TodayHeader } from "@/components/board/today-header";
import { ActivityCard, CurrentTopCard } from "@/components/sidebar/sidebar";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Today's leaderboard",
  description: "Listings ranked by what was paid today (UTC). The board resets every day at midnight UTC.",
  alternates: { canonical: "/today" },
};

export default async function TodayPage() {
  const today = toDateKey();
  const [settings, board, top, activity, entries] = await Promise.all([getSettings(), getDailyBoard(today, { limit: 100 }), getAllTimeBoard({ page: 1, pageSize: 1 }), getRecentActivity(6), getBoardEntries()]);
  return (
    <>
      <LiveRefresh />
      <CategoryBar view="today" />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <TodayHeader dateKey={today} count={board.count} volume={board.volume} />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
          <section aria-labelledby="today-board" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="today-board" className="sr-only">
                Today&apos;s ranking
              </h2>
              <BoardTabs active="today" />
              <p className="text-xs text-subtle">Ranked by amount paid today · ties go to who paid first</p>
            </div>
            {board.items.length ? (
              <AnimatedRows className="stagger mt-4 space-y-2.5">
                {board.items.map((item, i) => (
                  <LeaderboardRow key={item.id} item={item} index={i} amountLabel="today" action={outbidHref(item.rank, item.amount, settings.rules)} />
                ))}
              </AnimatedRows>
            ) : (
              <EmptyState icon={Sunrise} title="A fresh board" className="mt-4">
                <p>No payments have been confirmed since 00:00 UTC. The first claim today takes #1 on this board.</p>
                <Button asChild className="mt-4">
                  <Link href="/claim">Claim today&apos;s #1</Link>
                </Button>
              </EmptyState>
            )}
            <p className="mt-6 text-center text-xs text-subtle">
              New listings and upgrades both count — a $20 upgrade adds $20 to today&apos;s spend. {settings.disclosure}
            </p>
          </section>
          <aside aria-label="Board highlights" className="space-y-4">
            <CurrentTopCard top={top.items[0] ?? null} topIncrement={settings.rules.topIncrement} boardCount={top.count} volume={entries.reduce((a, e) => a + e.total, 0)} />
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm shadow-sm">
              <p className="font-semibold">Missed a day?</p>
              <p className="mt-1 text-muted">Every day&apos;s final ranking is kept in the archive.</p>
              <Link href={`/daily/${addDays(today, -1)}`} className="mt-3 inline-block text-sm font-semibold text-brand-ink hover:underline">
                See yesterday&apos;s winners →
              </Link>
            </div>
            <ActivityCard items={activity} />
          </aside>
        </div>
      </div>
    </>
  );
}

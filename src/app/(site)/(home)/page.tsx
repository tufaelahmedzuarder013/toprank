import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { getSettings } from "@/server/settings";
import { getAllTimeBoard, getBoardEntries, getCardsBySlugs, getCategoriesOverview, getDailyBoard, getEnabledCategories, getRecentActivity, outbidHref } from "@/server/leaderboard";
import { toDateKey } from "@/lib/time";
import { CategoryBar } from "@/components/layout/category-bar";
import { ClaimCard } from "@/components/claim/claim-card";
import { LeaderboardRow } from "@/components/board/leaderboard-row";
import { AnimatedRows, LiveRefresh } from "@/components/board/animated-rows";
import { BoardTabs, EmptyState, Pagination } from "@/components/board/board-ui";
import { ActivityCard, CurrentTopCard, FeaturedCard, SeasonalCard, TodayTopCard } from "@/components/sidebar/sidebar";
import { CategoryGrid, FinalCta, HowItWorksSection, SectionHeading, WhySection } from "@/components/sections/home-sections";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/utils";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const PAGE_SIZE = 25;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  const settings = await getSettings();
  const [board, entries, today, activity, categories, overview, featured] = await Promise.all([
    getAllTimeBoard({ page, pageSize: PAGE_SIZE }),
    getBoardEntries(),
    getDailyBoard(toDateKey(), { limit: 5 }),
    getRecentActivity(6),
    getEnabledCategories(),
    getCategoriesOverview(),
    getCardsBySlugs(settings.featured.enabled ? settings.featured.listingSlugs : []),
  ]);
  const totals = entries.map((e) => e.total);
  const top = page === 1 ? board.items[0] : (await getAllTimeBoard({ page: 1, pageSize: 1 })).items[0];
  const volume = totals.reduce((a, b) => a + b, 0);
  const pageCount = Math.ceil(board.count / PAGE_SIZE);
  const topClaim = totals.length ? totals[0] + settings.rules.topIncrement : settings.rules.minAmount;

  return (
    <>
      <LiveRefresh />
      <CategoryBar />
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-6">
        <ClaimCard
          heading={settings.home.heading}
          subheading={settings.home.subheading}
          rulesNote={settings.home.rulesNote}
          disclosure={settings.disclosure}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          totals={totals}
          rules={settings.rules}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-8">
          <section aria-labelledby="board-heading" className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="board-heading" className="sr-only">
                All-time leaderboard
              </h2>
              <BoardTabs active="all" />
              <p className="text-xs text-subtle">
                {plural(board.count, "listing")} · ranked by confirmed total
              </p>
            </div>

            {board.items.length ? (
              <AnimatedRows className="stagger mt-4 space-y-2.5" label="All-time ranking">
                {board.items.map((item, i) => (
                  <LeaderboardRow key={item.id} item={item} index={i} amountLabel="total" action={outbidHref(item.rank, item.amount, settings.rules)} />
                ))}
              </AnimatedRows>
            ) : (
              <EmptyState icon={Trophy} title="The board is empty" className="mt-4">
                <p>Nobody has claimed a spot yet. The first listing takes #1.</p>
                <Button asChild className="mt-4">
                  <Link href="/claim">Claim #1</Link>
                </Button>
              </EmptyState>
            )}
            <Pagination page={page} pageCount={pageCount} hrefFor={(p) => (p === 1 ? "/" : `/?page=${p}`)} />
            <p className="mt-6 text-center text-xs text-subtle">{settings.disclosure}</p>
          </section>

          <aside aria-label="Board highlights" className="space-y-4">
            <CurrentTopCard top={top ?? null} topIncrement={settings.rules.topIncrement} boardCount={board.count} volume={volume} />
            <SeasonalCard seasonal={settings.seasonal} />
            <TodayTopCard items={today.items} volume={today.volume} />
            <FeaturedCard featured={settings.featured} items={featured} />
            <ActivityCard items={activity} />
          </aside>
        </div>
      </div>

      <HowItWorksSection rules={settings.rules} />
      <WhySection />
      <section aria-labelledby="cats" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div id="cats">
            <SectionHeading eyebrow="Categories" title="Climb your own corner of the board">
              Every listing also ranks inside its category — a cheaper way to be #1 where your audience is looking.
            </SectionHeading>
          </div>
          <Link href="/categories" className="text-sm font-semibold text-brand-ink hover:underline">
            All {overview.length} categories →
          </Link>
        </div>
        <div className="mt-8">
          <CategoryGrid categories={overview} limit={8} />
        </div>
      </section>
      <FinalCta heading={settings.home.ctaHeading} text={settings.home.ctaText} topClaim={topClaim} />
    </>
  );
}

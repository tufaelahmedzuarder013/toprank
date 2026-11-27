import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crown, Sunrise, Trophy } from "lucide-react";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { amountToLeadCategory, getAllTimeBoard, getBoardEntries, getDailyBoard, outbidHref } from "@/server/leaderboard";
import { toDateKey } from "@/lib/time";
import { CategoryBar } from "@/components/layout/category-bar";
import { LeaderboardRow } from "@/components/board/leaderboard-row";
import { AnimatedRows } from "@/components/board/animated-rows";
import { EmptyState, Pagination } from "@/components/board/board-ui";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ResetCountdown } from "@/components/ui/countdown";
import { Button } from "@/components/ui/button";
import { cn, formatUsd, plural } from "@/lib/utils";

const PAGE_SIZE = 25;

async function load(slug: string) {
  return db.category.findFirst({ where: { slug, enabled: true } });
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await load((await params).slug);
  if (!category) return {};
  return { title: `${category.name} leaderboard`, description: category.description || `The ${category.name} leaderboard.`, alternates: { canonical: `/categories/${category.slug}` } };
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await load(slug);
  if (!category) notFound();
  const view = sp.view === "today" ? "today" : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const settings = await getSettings();

  const [allTime, today, catEntries, allEntries] = await Promise.all([
    view === "all" ? getAllTimeBoard({ categoryId: category.id, page, pageSize: PAGE_SIZE }) : null,
    view === "today" ? getDailyBoard(toDateKey(), { categoryId: category.id, limit: 100 }) : null,
    getBoardEntries(category.id),
    getBoardEntries(),
  ]);
  const catTop = catEntries[0]?.total ?? null;
  const reachTop = amountToLeadCategory(catTop, allEntries[0]?.total ?? null, settings.rules);
  const items = view === "all" ? allTime!.items : today!.items;
  const count = view === "all" ? allTime!.count : today!.count;
  const q = `&category=${category.slug}`;

  return (
    <>
      <CategoryBar active={category.slug} view={view === "today" ? "today" : undefined} />
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
                <CategoryIcon name={category.icon} className="size-7" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{category.name}</h1>
                <p className="mt-1 max-w-xl text-sm text-muted">{category.description}</p>
                <p className="mt-2 text-xs text-subtle">{plural(catEntries.length, "active listing")}</p>
              </div>
            </div>
            <div className="w-full rounded-2xl border border-[color-mix(in_oklab,var(--gold)_40%,var(--border))] bg-[color-mix(in_oklab,var(--gold)_7%,var(--surface))] p-4 sm:w-auto sm:min-w-64">
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">
                <Crown className="size-3.5 text-[var(--gold)]" /> To reach #1 in {category.name}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular">{formatUsd(reachTop)}</p>
              <p className="text-xs text-subtle">{catTop ? `Current leader: ${formatUsd(catTop)}` : "The top spot is open"}</p>
              <Button asChild size="sm" className="mt-3 w-full">
                <Link href={`/claim?amount=${reachTop}${q}`}>Claim #1 here</Link>
              </Button>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Category views" className="inline-flex rounded-xl border border-border bg-surface-2 p-1">
            {(["all", "today"] as const).map((v) => (
              <Link
                key={v}
                href={v === "all" ? `/categories/${category.slug}` : `/categories/${category.slug}?view=today`}
                aria-current={view === v ? "page" : undefined}
                className={cn("rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-colors", view === v ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground")}
              >
                {v === "all" ? "All-Time" : "Today"}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-subtle">{view === "today" ? <>Resets in <ResetCountdown compact className="font-semibold" /></> : `${plural(count, "listing")} · ranked by confirmed total`}</p>
        </div>

        {items.length ? (
          <AnimatedRows className="stagger mt-4 space-y-2.5">
            {items.map((item, i) => (
              <LeaderboardRow key={item.id} item={item} index={i} amountLabel={view === "today" ? "today" : "total"} action={item.rank === 1 && view === "all" ? { href: `/claim?amount=${reachTop}${q}`, label: "Take #1", title: `Lead ${category.name} with ${formatUsd(reachTop)}` } : outbidHref(item.rank, item.amount, settings.rules, q)} />
            ))}
          </AnimatedRows>
        ) : (
          <EmptyState icon={view === "today" ? Sunrise : Trophy} title={view === "today" ? "No payments in this category today" : "No listings here yet"} className="mt-4">
            <p>Be the first {category.name} listing{view === "today" ? " today" : ""} and take #1.</p>
            <Button asChild className="mt-4">
              <Link href={`/claim?amount=${settings.rules.minAmount}${q}`}>Claim #1 in {category.name}</Link>
            </Button>
          </EmptyState>
        )}
        {view === "all" && <Pagination page={page} pageCount={Math.ceil(count / PAGE_SIZE)} hrefFor={(p) => `/categories/${category.slug}${p > 1 ? `?page=${p}` : ""}`} />}
        <p className="mt-6 text-center text-xs text-subtle">{settings.disclosure}</p>
      </div>
    </>
  );
}

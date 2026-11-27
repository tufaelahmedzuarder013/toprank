import type { Metadata } from "next";
import Form from "next/form";
import { SearchX, Search } from "lucide-react";
import { getEnabledCategories, outbidHref, searchListings } from "@/server/leaderboard";
import { getSettings } from "@/server/settings";
import { LeaderboardRow } from "@/components/board/leaderboard-row";
import { AnimatedRows } from "@/components/board/animated-rows";
import { EmptyState } from "@/components/board/board-ui";
import { Button } from "@/components/ui/button";
import { fieldBase, NativeSelect } from "@/components/ui/input";
import { cn, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const categorySlug = typeof sp.category === "string" ? sp.category : "";
  const view = sp.view === "today" ? "today" : "all";
  const [categories, settings] = await Promise.all([getEnabledCategories(), getSettings()]);
  const category = categories.find((c) => c.slug === categorySlug);
  const hasQuery = Boolean(q.trim() || category || view === "today");
  const results = hasQuery ? await searchListings({ q, categoryId: category?.id, view, limit: 60 }) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Search the board</h1>
      <Form action="/search" className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_180px_140px_auto]">
        <label className="relative min-w-0">
          <span className="sr-only">Search term</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
          <input name="q" defaultValue={q} placeholder="Name, domain or category" className={cn(fieldBase, "h-11 pr-3 pl-10")} />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Category</span>
          <NativeSelect name="category" defaultValue={categorySlug}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Board</span>
          <NativeSelect name="view" defaultValue={view}>
            <option value="all">All-time</option>
            <option value="today">Today</option>
          </NativeSelect>
        </label>
        <Button type="submit" className="h-11">
          Search
        </Button>
      </Form>

      {hasQuery && (
        <p className="mt-6 text-sm text-muted" aria-live="polite">
          {plural(results.length, "result")}
          {q && (
            <>
              {" "}
              for <strong className="text-foreground">“{q}”</strong>
            </>
          )}
          {category && <> in {category.name}</>}
          {view === "today" && <> paid today</>}
        </p>
      )}

      {results.length ? (
        <AnimatedRows className="stagger mt-4 space-y-2.5">
          {results.map((item, i) => (
            <LeaderboardRow key={item.id} item={item} index={i} amountLabel={view === "today" ? "today" : "total"} action={outbidHref(item.rank, item.amount, settings.rules)} />
          ))}
        </AnimatedRows>
      ) : hasQuery ? (
        <EmptyState icon={SearchX} title="No listings found" className="mt-4">
          Try a shorter term, another category, or the all-time board.
        </EmptyState>
      ) : (
        <p className="mt-8 text-center text-sm text-subtle">Search by product name, domain or category.</p>
      )}
    </div>
  );
}

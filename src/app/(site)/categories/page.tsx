import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { getCategoriesOverview } from "@/server/leaderboard";
import { CategoryGrid } from "@/components/sections/home-sections";
import { EmptyState } from "@/components/board/board-ui";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse the leaderboard by category — every listing also ranks within its category.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getCategoriesOverview();
  const listed = categories.reduce((s, c) => s + c.count, 0);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <div className="max-w-2xl">
        <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-brand-ink uppercase">
          <LayoutGrid className="size-4" /> Categories
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Explore every corner of the board</h1>
        <p className="mt-3 text-[15px] text-muted">
          {categories.length} categories · {listed.toLocaleString("en-US")} active listings. Each category has its own all-time and daily ranking.
        </p>
      </div>
      <div className="mt-8">{categories.length ? <CategoryGrid categories={categories} /> : <EmptyState title="No categories yet">An admin can add categories from the dashboard.</EmptyState>}</div>
    </div>
  );
}

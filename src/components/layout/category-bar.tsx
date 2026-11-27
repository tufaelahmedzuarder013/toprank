import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { getEnabledCategories } from "@/server/leaderboard";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { CategoryScroller } from "./category-scroller";

const chip = "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors";

export async function CategoryBar({ active, view }: { active?: string; view?: "today" }) {
  const categories = await getEnabledCategories();
  const activeIndex = active ? categories.findIndex((c) => c.slug === active) + 1 : 0;
  const q = view === "today" ? "?view=today" : "";
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav aria-label="Categories">
          <CategoryScroller activeIndex={activeIndex}>
            <Link data-chip href={view === "today" ? "/today" : "/"} aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground")}>
              <Flame className="size-4" aria-hidden /> All
            </Link>
            {categories.map((c) => {
              const on = c.slug === active;
              return (
                <Link
                  data-chip
                  key={c.id}
                  href={`/categories/${c.slug}${q}`}
                  aria-current={on ? "page" : undefined}
                  className={cn(chip, on ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground")}
                >
                  <CategoryIcon name={c.icon} className="size-4" />
                  {c.name}
                </Link>
              );
            })}
            <Link data-chip href="/categories" className={cn(chip, "border-dashed border-border-strong text-foreground hover:bg-surface")}>
              Explore all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </CategoryScroller>
        </nav>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function BoardTabs({ active, className }: { active: "all" | "today" | "archive"; className?: string }) {
  const tabs = [
    { key: "all", href: "/", label: "All-Time" },
    { key: "today", href: "/today", label: "Today" },
    { key: "archive", href: "/daily", label: "Daily Archive" },
  ] as const;
  return (
    <nav aria-label="Leaderboard views" className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", className)}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors sm:px-4",
            active === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const list = [...pages].sort((a, b) => a - b);
  const cell = "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(cell, "text-muted hover:bg-surface-2 hover:text-foreground")} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(cell, "text-subtle opacity-50")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - list[i - 1] > 1 && <span className="px-1 text-subtle">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(cell, p === page ? "bg-foreground text-background" : "text-muted hover:bg-surface-2 hover:text-foreground")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(cell, "text-muted hover:bg-surface-2 hover:text-foreground")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(cell, "text-subtle opacity-50")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function EmptyState({ title, children, icon: Icon = Inbox, className }: { title: string; children?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-14 text-center", className)}>
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-subtle">
        <Icon className="size-6" />
      </span>
      <h3 className="text-base font-bold">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

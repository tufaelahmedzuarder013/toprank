import Link from "next/link";
import { BadgeCheck, Clock, ExternalLink, MousePointerClick, TrendingUp } from "lucide-react";
import type { ListingCard } from "@/server/leaderboard";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompact, formatUsd } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import { ListingLogo } from "./listing-logo";
import { RankBadge } from "./rank-badge";

export type RowAction = { href: string; label: string; title: string };

const rowTone: Record<number, string> = {
  1: "border-[color-mix(in_oklab,var(--gold)_45%,var(--border))] bg-[linear-gradient(100deg,color-mix(in_oklab,var(--gold)_9%,var(--surface))_0%,var(--surface)_55%)] shadow-md",
  2: "border-[color-mix(in_oklab,var(--silver)_40%,var(--border))] bg-[linear-gradient(100deg,color-mix(in_oklab,var(--silver)_8%,var(--surface))_0%,var(--surface)_50%)]",
  3: "border-[color-mix(in_oklab,var(--bronze)_40%,var(--border))] bg-[linear-gradient(100deg,color-mix(in_oklab,var(--bronze)_8%,var(--surface))_0%,var(--surface)_50%)]",
};

export function LeaderboardRow({ item, amountLabel, action, index = 0 }: { item: ListingCard; amountLabel: string; action?: RowAction; index?: number }) {
  const top = item.rank <= 3;
  return (
    <article
        data-index={index}
        className={cn(
          "group relative flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl border bg-surface p-3 transition-[border-color,box-shadow,transform] duration-200 hover:border-border-strong hover:shadow-md sm:flex-nowrap sm:gap-x-4 sm:p-4",
          top ? rowTone[item.rank] : "border-border",
          item.rank === 1 && "sm:py-5",
        )}
      >
        <RankBadge rank={item.rank} size={item.rank === 1 ? "lg" : "md"} className={item.rank === 1 ? "max-sm:size-9 max-sm:rounded-xl max-sm:text-sm" : undefined} />
        <ListingLogo src={item.logoUrl} name={item.name} kind={item.kind} size={44} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className={cn("min-w-0 truncate font-display font-bold tracking-tight", item.rank === 1 ? "text-[16px] sm:text-[17px]" : "text-[15px]")}>
              <Link href={`/p/${item.slug}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-ring">
                {item.name}
              </Link>
            </h3>
            {item.verified && <BadgeCheck className="size-4 shrink-0 text-brand-2" aria-label="Verified owner" />}
            {item.isDemo && (
              <Badge tone="violet" className="shrink-0 max-[400px]:px-1.5" title="Sample listing for demonstration">
                Demo
              </Badge>
            )}
          </div>
          {item.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted">{item.description}</p>}
          <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <Link href={`/categories/${item.category.slug}`} className="relative z-10 inline-flex items-center gap-1 rounded-md font-medium text-muted hover:text-foreground">
              <CategoryIcon name={item.category.icon} className="size-3.5" />
              {item.category.name}
            </Link>
            <a href={`/go/${item.slug}`} target="_blank" rel="sponsored nofollow noopener" className="relative z-10 inline-flex min-w-0 items-center gap-1 hover:text-foreground">
              <span className="max-w-[14rem] truncate">{item.domain}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            {item.addedAt && (
              <span className="hidden items-center gap-1 min-[420px]:inline-flex" title={new Date(item.addedAt).toUTCString()}>
                <Clock className="size-3" aria-hidden /> {timeAgo(item.addedAt)}
              </span>
            )}
            <span className="hidden items-center gap-1 md:inline-flex">
              <MousePointerClick className="size-3" aria-hidden /> {formatCompact(item.clicks)} clicks
            </span>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-4 sm:flex">
          <div className="text-right">
            <p className={cn("font-display font-extrabold tracking-tight tabular", item.rank === 1 ? "text-2xl" : "text-lg")}>{formatUsd(item.amount)}</p>
            <p className="text-[11px] font-medium text-subtle">{amountLabel}</p>
          </div>
          <div className="relative z-10 hidden flex-col gap-1.5 lg:flex">
            <Link href={`/p/${item.slug}`} className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-2">
              View details
            </Link>
            {action && (
              <Link href={action.href} title={action.title} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-brand/40 bg-brand-softer px-3 text-[13px] font-semibold text-brand-ink transition-colors hover:border-brand hover:bg-brand-soft">
                <TrendingUp className="size-3.5" aria-hidden /> {action.label}
              </Link>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-2 lg:hidden">
          <div className="mr-auto min-w-0 sm:hidden">
            <p className="font-display text-lg leading-tight font-extrabold tracking-tight tabular">{formatUsd(item.amount)}</p>
            <p className="text-[11px] font-medium text-subtle">{amountLabel}</p>
          </div>
          <Link href={`/p/${item.slug}`} className="relative z-10 inline-flex h-8 items-center justify-center rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold transition-colors hover:bg-surface-2 sm:flex-1">
            Details
          </Link>
          {action && (
            <Link href={action.href} title={action.title} className="relative z-10 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-brand/40 bg-brand-softer px-3 text-[13px] font-semibold whitespace-nowrap text-brand-ink transition-colors hover:border-brand hover:bg-brand-soft sm:flex-1">
              <TrendingUp className="size-3.5" aria-hidden /> {action.label}
            </Link>
          )}
        </div>
      </article>
  );
}

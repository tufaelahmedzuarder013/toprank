import { CalendarClock } from "lucide-react";
import { ResetCountdown } from "@/components/ui/countdown";
import { formatDayLabel } from "@/lib/time";
import { formatUsd } from "@/lib/utils";

export function TodayHeader({ dateKey, count, volume, category }: { dateKey: string; count: number; volume: number; category?: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 size-56 rounded-full bg-brand-2/20 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-brand-2-ink uppercase">
            <CalendarClock className="size-4" /> {formatDayLabel(dateKey)} · UTC
          </p>
          <h1 className="mt-2 font-display text-[26px] leading-tight font-extrabold tracking-tight sm:text-[32px]">{category ? `Today in ${category}` : "Today's leaderboard"}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">Ranked by what was paid today. Everything resets at midnight UTC — then a new race starts.</p>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-3">
          <div className="rounded-2xl border border-border bg-surface-2 px-3 py-2.5 sm:px-4">
            <dt className="text-[11px] font-semibold text-subtle">Resets in</dt>
            <dd className="font-display text-lg font-extrabold">
              <ResetCountdown compact />
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 px-3 py-2.5 sm:px-4">
            <dt className="text-[11px] font-semibold text-subtle">Listings</dt>
            <dd className="font-display text-lg font-extrabold tabular">{count.toLocaleString("en-US")}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface-2 px-3 py-2.5 sm:px-4">
            <dt className="text-[11px] font-semibold text-subtle">Spent today</dt>
            <dd className="font-display text-lg font-extrabold tabular">{formatUsd(volume)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

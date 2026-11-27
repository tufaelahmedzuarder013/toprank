"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import type { RankingRules } from "@/config/defaults";
import { evaluateClaim, type BoardEntry } from "@/lib/ranking";
import { formatUsd, ordinal } from "@/lib/utils";
import { startUpgradeAction } from "@/app/actions/claim";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { AmountStepper } from "@/components/claim/amount-stepper";
import { RankBadge } from "@/components/board/rank-badge";

export function UpgradeForm({ listingId, currentTotal, currentRank, entries, rules, demo }: { listingId: string; currentTotal: number; currentRank: number; entries: BoardEntry[]; rules: RankingRules; demo: boolean }) {
  const [state, action, pending] = useActionState(startUpgradeAction, initialFormState);
  const others = entries.filter((e) => e.id !== listingId);
  const nextTarget = currentRank > 1 ? (currentRank - 1 === 1 ? others[0].total + rules.topIncrement : others[currentRank - 2].total + rules.overtakeIncrement) : currentTotal + 1;
  const [value, setValue] = useState(String(Math.max(currentTotal + 1, nextTarget)));
  const ev = useMemo(() => evaluateClaim({ entries, rules, newTotal: value === "" ? NaN : Number(value), currentTotal, listingId }), [entries, rules, value, currentTotal, listingId]);
  const issue = value === "" ? null : ev.issues[0];
  const top = others[0]?.total;

  return (
    <ActionForm action={action} className="space-y-4">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <label htmlFor="up-total" className="mb-1.5 block text-xs font-semibold text-muted">
            New total
          </label>
          <AmountStepper id="up-total" name="newTotal" value={value} onChange={setValue} min={currentTotal + 1} max={rules.maxTotal} invalid={Boolean(issue)} size="lg" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {currentRank > 1 && (
              <button type="button" onClick={() => setValue(String(nextTarget))} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted hover:border-brand hover:text-foreground">
                #{currentRank - 1} · {formatUsd(nextTarget)}
              </button>
            )}
            {currentRank > 1 && top !== undefined && (
              <button type="button" onClick={() => setValue(String(top + rules.topIncrement))} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted hover:border-brand hover:text-foreground">
                #1 · {formatUsd(top + rules.topIncrement)}
              </button>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-4" aria-live="polite">
          {issue ? (
            <div className="space-y-2 text-sm text-danger">
              <p className="flex gap-2 font-medium">
                <CircleAlert className="mt-0.5 size-4 shrink-0" /> {issue.message}
              </p>
              {(issue.code === "TOP_GAP" || issue.code === "OVERTAKE_GAP") && (
                <div className="flex gap-2 pl-6">
                  {issue.validOptions
                    .filter((v) => v > currentTotal)
                    .map((v) => (
                      <Button key={v} type="button" size="xs" variant="secondary" onClick={() => setValue(String(v))}>
                        Use {formatUsd(v)}
                      </Button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <RankBadge rank={ev.estimatedRank} />
              <div className="text-sm">
                <p className="font-semibold">
                  Estimated {ordinal(ev.estimatedRank)} {ev.estimatedRank < currentRank ? `(up from #${currentRank})` : ""}
                </p>
                <p className="text-xs text-muted">You pay only the difference. Final position is set at confirmation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm text-muted">
          {formatUsd(currentTotal)} → <strong className="text-foreground">{formatUsd(ev.newTotal || currentTotal)}</strong> · due now{" "}
          <strong className="font-display text-lg text-foreground tabular">{formatUsd(ev.ok ? ev.charge : 0)}</strong>
        </p>
        <Button type="submit" disabled={!ev.ok || pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null} {demo ? "Continue to demo checkout" : "Pay the difference"} <ArrowRight />
        </Button>
      </div>
      {state.error && <p className="rounded-xl bg-danger-soft p-3 text-[13px] text-danger">{state.error}</p>}
    </ActionForm>
  );
}

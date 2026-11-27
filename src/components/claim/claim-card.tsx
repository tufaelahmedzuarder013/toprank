"use client";

import { useMemo, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Crown, Info, Link2, Sparkles } from "lucide-react";
import type { RankingRules } from "@/config/defaults";
import { parseTarget } from "@/lib/url";
import { cn, formatUsd, ordinal } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fieldBase, NativeSelect } from "@/components/ui/input";
import { AmountStepper } from "./amount-stepper";
import { estimateFromTotals } from "./estimate";

type Props = {
  heading: string;
  subheading: string;
  rulesNote: string;
  disclosure: string;
  categories: { slug: string; name: string }[];
  totals: number[];
  rules: RankingRules;
  defaultCategory?: string;
};

/** A friendly starting amount: roughly what it takes to enter the top 10 today. */
function suggestedAmount(totals: number[], rules: RankingRules) {
  if (!totals.length) return rules.minAmount;
  const top = totals[0];
  const topClaim = top + rules.topIncrement;
  const idx = Math.min(9, totals.length - 1);
  const s = idx === 0 ? topClaim : totals[idx] + rules.overtakeIncrement;
  return Math.max(rules.minAmount, s > top && s < topClaim ? topClaim : s);
}

/** Compact claim form shown at the top of the home page. Estimates are instant; the server re-checks everything. */
export function ClaimCard({ heading, subheading, rulesNote, disclosure, categories, totals, rules, defaultCategory }: Props) {
  const router = useRouter();
  const top = totals[0] ?? 0;
  const topClaim = top ? top + rules.topIncrement : rules.minAmount;
  const [amount, setAmount] = useState(() => String(suggestedAmount(totals, rules)));
  const [target, setTarget] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [touched, setTouched] = useState(false);
  const [errors, setErrors] = useState<{ target?: string; category?: string }>({});

  const value = Number(amount);
  const estimate = useMemo(() => estimateFromTotals(totals, rules, amount === "" ? NaN : value), [totals, rules, amount, value]);
  const issue = amount === "" ? null : estimate.issues[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const next: typeof errors = {};
    const parsed = parseTarget(target);
    if (!target.trim()) next.target = "Enter a website URL or an X handle.";
    else if (!parsed.ok) next.target = parsed.error;
    if (!category) next.category = "Choose a category.";
    setErrors(next);
    if (next.target || next.category || !estimate.ok) return;
    const params = new URLSearchParams({ target: target.trim(), amount: String(value), category });
    router.push(`/claim?${params}`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <section id="claim" aria-labelledby="claim-heading" className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-md">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_100%_at_100%_0%,black,transparent)]">
          <div className="grid-bg absolute inset-0" />
        </div>
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-brand-2/15 blur-3xl" />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 id="claim-heading" className="font-display text-[26px] leading-tight font-extrabold tracking-tight sm:text-[32px]">
                {heading.replace(/\.$/, "")}
                <span className="text-gradient">.</span>
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted sm:text-[15px]">{subheading}</p>
            </div>
            <button
              type="button"
              onClick={() => setAmount(String(topClaim))}
              className="group flex items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--gold)_40%,var(--border))] bg-[color-mix(in_oklab,var(--gold)_8%,var(--surface))] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--gold)]"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--gold)] text-[#3d2a00]">
                <Crown className="size-[18px]" />
              </span>
              <span>
                <span className="block text-[11px] font-semibold tracking-wide text-muted uppercase">Current #1</span>
                <span className="block font-display text-lg leading-tight font-extrabold tabular">{top ? formatUsd(top) : "Open"}</span>
              </span>
              <span className="ml-1 hidden text-xs font-semibold text-brand-ink group-hover:underline min-[400px]:block">
                Take it with {formatUsd(topClaim)}
                <ArrowRight className="ml-0.5 inline size-3" />
              </span>
            </button>
          </div>

          <form onSubmit={submit} noValidate className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,200px)_minmax(0,1.6fr)_minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <label htmlFor="cc-amount" className="mb-1.5 block text-xs font-semibold text-muted">
                Amount (USD)
              </label>
              <AmountStepper id="cc-amount" value={amount} onChange={setAmount} min={1} max={rules.maxTotal} invalid={Boolean(issue)} describedBy="cc-estimate" />
            </div>
            <div className="min-w-0">
              <label htmlFor="cc-target" className="mb-1.5 block text-xs font-semibold text-muted">
                Website URL or X handle
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" aria-hidden />
                <input
                  id="cc-target"
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    if (errors.target) setErrors((er) => ({ ...er, target: undefined }));
                  }}
                  placeholder="yourproduct.com or @handle"
                  autoComplete="url"
                  inputMode="url"
                  spellCheck={false}
                  aria-invalid={Boolean(touched && errors.target) || undefined}
                  aria-describedby={errors.target ? "cc-target-error" : undefined}
                  className={cn(fieldBase, "h-11 pr-3 pl-10")}
                />
              </div>
              {touched && errors.target && (
                <p id="cc-target-error" role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.target}
                </p>
              )}
            </div>
            <div className="min-w-0">
              <label htmlFor="cc-category" className="mb-1.5 block text-xs font-semibold text-muted">
                Category
              </label>
              <NativeSelect
                id="cc-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (errors.category) setErrors((er) => ({ ...er, category: undefined }));
                }}
                aria-invalid={Boolean(touched && errors.category) || undefined}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
              {touched && errors.category && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                  {errors.category}
                </p>
              )}
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" size="lg" className="h-11 w-full px-5 lg:w-auto">
                Claim Your Rank <ArrowRight />
              </Button>
            </div>
          </form>

          <div id="cc-estimate" aria-live="polite" className="mt-3 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
            {issue ? (
              <div className="flex flex-wrap items-center gap-2 text-danger">
                <Info className="size-4 shrink-0" />
                <span className="font-medium">{issue.code === "TOP_GAP" ? `Taking #1 needs at least ${formatUsd(issue.validOptions[1])}.` : issue.message}</span>
                {(issue.code === "TOP_GAP" || issue.code === "OVERTAKE_GAP") && (
                  <span className="flex gap-1.5">
                    {issue.validOptions.map((v) => (
                      <button key={v} type="button" onClick={() => setAmount(String(v))} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground hover:border-brand">
                        {formatUsd(v)}
                      </button>
                    ))}
                  </span>
                )}
                {issue.code === "BELOW_MIN" && (
                  <button type="button" onClick={() => setAmount(String(rules.minAmount))} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-semibold text-foreground hover:border-brand">
                    Use {formatUsd(rules.minAmount)}
                  </button>
                )}
              </div>
            ) : amount !== "" ? (
              <p className="flex items-center gap-2 text-muted">
                <Sparkles className="size-4 shrink-0 text-brand" />
                <span>
                  Estimated position{" "}
                  <motion.strong
                    key={estimate.estimatedRank}
                    initial={{ y: 6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="inline-block font-display text-base font-extrabold text-foreground tabular"
                  >
                    #{estimate.estimatedRank}
                  </motion.strong>{" "}
                  <span className="text-subtle">
                    ({ordinal(estimate.estimatedRank)} of {totals.length + 1})
                  </span>
                </span>
              </p>
            ) : null}
            <p className="text-subtle">
              Min {formatUsd(rules.minAmount)} · #1 needs current #1 + {formatUsd(rules.topIncrement)}
            </p>
          </div>
          <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-subtle">
            {rulesNote} <span className="text-muted">{disclosure}</span>
          </p>
        </div>
      </section>
    </MotionConfig>
  );
}

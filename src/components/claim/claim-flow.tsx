"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, AtSign, BadgeCheck, CircleAlert, Globe, ImageIcon, LoaderCircle, Lock, RefreshCw, Sparkles, Trophy } from "lucide-react";
import type { RankingRules } from "@/config/defaults";
import { parseTarget } from "@/lib/url";
import { cn, formatUsd, ordinal } from "@/lib/utils";
import { previewTargetAction, startClaimAction, type TargetPreview } from "@/app/actions/claim";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, fieldBase, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { ListingLogo } from "@/components/board/listing-logo";
import { RankBadge } from "@/components/board/rank-badge";
import { AmountStepper } from "./amount-stepper";
import { estimateFromTotals } from "./estimate";

type Props = {
  categories: { slug: string; name: string }[];
  totals: number[];
  rules: RankingRules;
  disclosure: string;
  mode: "demo" | "stripe";
  signedIn: boolean;
  initial: { target: string; amount: string; category: string };
};

export function ClaimFlow({ categories, totals, rules, disclosure, mode, signedIn, initial }: Props) {
  const [state, formAction, submitting] = useActionState(startClaimAction, initialFormState);
  const [target, setTarget] = useState(initial.target);
  const [preview, setPreview] = useState<TargetPreview | null>(null);
  const [checking, startCheck] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [category, setCategory] = useState(initial.category);
  const [amount, setAmount] = useState(initial.amount);
  const [terms, setTerms] = useState(false);
  const checkedFor = useRef<string | null>(null);
  const edited = useRef({ name: false, description: false, logo: false });

  const estimate = useMemo(() => estimateFromTotals(totals, rules, amount === "" ? NaN : Number(amount)), [totals, rules, amount]);
  const issue = amount === "" ? null : estimate.issues[0];
  const existing = preview?.ok ? preview.existing : null;
  const blocked = existing && existing.state !== "free";
  const fe = state.fieldErrors ?? {};

  const check = (value = target) => {
    const v = value.trim();
    if (!v || checkedFor.current === v) return;
    const local = parseTarget(v);
    if (!local.ok) {
      checkedFor.current = v;
      setPreview({ ok: false, error: local.error });
      return;
    }
    checkedFor.current = v;
    startCheck(async () => {
      const res = await previewTargetAction(v);
      if (checkedFor.current !== v) return;
      setPreview(res);
      if (res.ok) {
        if (!edited.current.name) setName(res.name);
        if (!edited.current.description) setDescription(res.description);
        if (!edited.current.logo) {
          setLogoUrl(res.logoUrl ?? "");
          setOgImageUrl(res.ogImageUrl ?? "");
        }
      }
    });
  };

  // Look up a link passed in from the home page claim card.
  const initialChecked = useRef(false);
  useEffect(() => {
    if (initialChecked.current || !initial.target) return;
    initialChecked.current = true;
    check(initial.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the initial value
  }, []);

  const ready = preview?.ok && !blocked && name.trim() && category && estimate.ok && terms;
  const categoryName = categories.find((c) => c.slug === category)?.name ?? "Category";
  const kind = preview?.ok ? preview.kind : parseTarget(target).ok && target.trim().startsWith("@") ? "X_PROFILE" : "WEBSITE";

  return (
    <ActionForm action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      <div className="min-w-0 space-y-5">
        {/* 1 — Link */}
        <Step n={1} title="Your link" description="A website URL or an X handle. We'll fetch the public details for you.">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              {kind === "X_PROFILE" ? <AtSign className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" /> : <Globe className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />}
              <input
                name="target"
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  checkedFor.current = null;
                }}
                onBlur={() => check()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    check();
                  }
                }}
                placeholder="https://yourproduct.com or @handle"
                aria-label="Website URL or X handle"
                aria-invalid={Boolean(fe.target || (preview && !preview.ok)) || undefined}
                spellCheck={false}
                autoComplete="url"
                className={cn(fieldBase, "h-12 pr-3 pl-10 text-base")}
              />
            </div>
            <Button type="button" variant="secondary" className="h-12" onClick={() => check()} disabled={checking || !target.trim()}>
              {checking ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
              <span className="hidden sm:inline">{checking ? "Checking…" : "Fetch details"}</span>
            </Button>
          </div>
          <div aria-live="polite" className="mt-3 space-y-2 empty:hidden">
            {preview && !preview.ok && <Alert tone="danger">{preview.error}</Alert>}
            {fe.target && <Alert tone="danger">{fe.target}</Alert>}
            {existing?.state === "listed" && (
              <Alert tone="warning">
                <strong>{existing.name}</strong> is already {existing.hidden ? "listed (currently hidden by a moderator)" : "on the board"}. Each link can only be listed once.{" "}
                {!existing.hidden && (
                  <Link href={`/p/${existing.slug}`} className="font-semibold underline">
                    View listing
                  </Link>
                )}{" "}
                — if it&apos;s yours, verify ownership from the listing page to upgrade it.
              </Alert>
            )}
            {existing?.state === "blocked" && <Alert tone="danger">This link can&apos;t be listed. Contact us if you think this is a mistake.</Alert>}
            {existing?.state === "reserved" && <Alert tone="warning">Someone is checking out this link right now. Please try again in a few minutes.</Alert>}
            {preview?.ok && existing?.state === "free" && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <BadgeCheck className="size-4 text-success" /> {preview.domain} is available{preview.fetched ? " — details fetched from the page." : "."}
              </p>
            )}
            {preview?.ok && preview.hint && existing?.state === "free" && <p className="text-xs text-subtle">{preview.hint}</p>}
          </div>
        </Step>

        {/* 2 — Details */}
        <Step n={2} title="How it appears" description="Edit anything — keep it accurate. Misleading listings are removed.">
          <div className={cn("grid gap-4 transition-opacity", checking && "pointer-events-none opacity-60")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="Name" htmlFor="cf-name" error={fe.name} hint={`${name.length}/60`}>
                <Input
                  id="cf-name"
                  name="name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => {
                    edited.current.name = true;
                    setName(e.target.value);
                  }}
                  placeholder="Product or profile name"
                  aria-invalid={Boolean(fe.name) || undefined}
                />
              </Field>
              <Field label="Category" htmlFor="cf-category" error={fe.category}>
                <NativeSelect id="cf-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={Boolean(fe.category) || undefined}>
                  <option value="" disabled>
                    Choose a category
                  </option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Short description" htmlFor="cf-desc" error={fe.description} hint={`${description.length}/200 — one line works best`}>
              <Textarea
                id="cf-desc"
                name="description"
                value={description}
                maxLength={200}
                rows={2}
                onChange={(e) => {
                  edited.current.description = true;
                  setDescription(e.target.value);
                }}
                placeholder="What it is and who it's for"
              />
            </Field>
            <Field label="Logo or avatar image URL (optional)" htmlFor="cf-logo" error={fe.logoUrl} hint="An https:// image. Leave empty to use your initials.">
              <div className="flex items-center gap-3">
                <ListingLogo key={logoUrl} src={logoUrl || null} name={name || "?"} kind={kind} size={44} />
                <div className="relative min-w-0 flex-1">
                  <ImageIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle" />
                  <input
                    id="cf-logo"
                    name="logoUrl"
                    value={logoUrl}
                    onChange={(e) => {
                      edited.current.logo = true;
                      setLogoUrl(e.target.value);
                    }}
                    placeholder="https://…/logo.png"
                    spellCheck={false}
                    className={cn(fieldBase, "h-11 pr-3 pl-10")}
                  />
                </div>
              </div>
            </Field>
            <input type="hidden" name="ogImageUrl" value={ogImageUrl} />
          </div>
        </Step>

        {/* 3 — Amount */}
        <Step n={3} title="Your amount" description={`Whole US dollars. Minimum ${formatUsd(rules.minAmount)}; #1 needs the current #1 total + ${formatUsd(rules.topIncrement)}.`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-start">
            <div>
              <AmountStepper name="amount" value={amount} onChange={setAmount} min={1} max={rules.maxTotal} invalid={Boolean(issue || fe.amount)} describedBy="cf-amount-help" size="lg" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  { label: "Min", value: rules.minAmount },
                  { label: "Top 10", value: totals.length >= 10 ? totals[9] + rules.overtakeIncrement : null },
                  { label: "Top 3", value: totals.length >= 3 ? totals[2] + rules.overtakeIncrement : null },
                  { label: "#1", value: totals.length ? totals[0] + rules.topIncrement : rules.minAmount },
                ]
                  .filter((c): c is { label: string; value: number } => c.value !== null)
                  .map((c) => (
                    <button key={c.label} type="button" onClick={() => setAmount(String(c.value))} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors", Number(amount) === c.value ? "border-brand bg-brand-soft text-brand-ink" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground")}>
                      {c.label} · {formatUsd(c.value)}
                    </button>
                  ))}
              </div>
            </div>
            <div id="cf-amount-help" aria-live="polite" className="rounded-2xl border border-border bg-surface-2 p-4">
              {issue ? (
                <div className="space-y-2 text-sm text-danger">
                  <p className="flex gap-2 font-medium">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    {issue.message}
                  </p>
                  {(issue.code === "TOP_GAP" || issue.code === "OVERTAKE_GAP") && (
                    <div className="flex flex-wrap gap-2 pl-6">
                      {issue.validOptions.map((v, i) => (
                        <Button key={v} type="button" size="xs" variant={i === 1 ? "primary" : "secondary"} onClick={() => setAmount(String(v))}>
                          Use {formatUsd(v)} {i === 1 && issue.code === "TOP_GAP" ? "→ #1" : ""}
                        </Button>
                      ))}
                    </div>
                  )}
                  {issue.code === "BELOW_MIN" && (
                    <Button type="button" size="xs" variant="secondary" className="ml-6" onClick={() => setAmount(String(rules.minAmount))}>
                      Use {formatUsd(rules.minAmount)}
                    </Button>
                  )}
                </div>
              ) : amount ? (
                <div className="flex items-center gap-3">
                  <RankBadge rank={estimate.estimatedRank} />
                  <div>
                    <p className="text-sm font-semibold">
                      Estimated {ordinal(estimate.estimatedRank)} of {totals.length + 1}
                    </p>
                    <p className="text-xs text-muted">Final position is set when payment is confirmed — if someone pays first, it&apos;s recalculated.</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Enter an amount to see your estimated position.</p>
              )}
              {fe.amount && !issue && <FieldError className="mt-2">{fe.amount}</FieldError>}
            </div>
          </div>
        </Step>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-md">
          <div className="border-b border-border bg-surface-2/60 p-5">
            <p className="text-xs font-bold tracking-wider text-subtle uppercase">Preview</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
              <RankBadge rank={estimate.ok ? estimate.estimatedRank : totals.length + 1} size="sm" />
              <ListingLogo key={`p-${logoUrl}`} src={logoUrl || null} name={name || "Your product"} kind={kind} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{name || "Your product"}</p>
                <p className="truncate text-xs text-subtle">{description || (preview?.ok ? preview.domain : "yourproduct.com")}</p>
              </div>
              <p className="font-display text-sm font-extrabold tabular">{formatUsd(Number(amount) || 0)}</p>
            </div>
          </div>
          <dl className="space-y-2.5 p-5 text-sm">
            <Row label="Listing">{preview?.ok ? preview.domain : "—"}</Row>
            <Row label="Category">{category ? categoryName : "—"}</Row>
            <Row label="Estimated position">{estimate.ok && amount ? `#${estimate.estimatedRank}` : "—"}</Row>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total due now</dt>
              <dd className="font-display text-2xl font-extrabold tabular">{formatUsd(estimate.ok ? estimate.charge : 0)}</dd>
            </div>
          </dl>
          <div className="space-y-4 border-t border-border p-5">
            <label className="flex items-start gap-3 text-[13px] leading-relaxed text-muted">
              <Checkbox name="terms" checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" aria-invalid={Boolean(fe.terms) || undefined} />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-semibold text-foreground underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/rules" target="_blank" className="font-semibold text-foreground underline">
                  ranking rules
                </Link>
                , and understand this is a paid placement and my final position is set at confirmation.
              </span>
            </label>
            {state.error && !state.fieldErrors?.target && (
              <Alert tone="danger">
                {state.error}
                {state.data?.code === "DUPLICATE" && typeof state.data.slug === "string" && (
                  <>
                    {" "}
                    <Link href={`/p/${state.data.slug}`} className="font-semibold underline">
                      View listing
                    </Link>
                  </>
                )}
              </Alert>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={!ready || submitting}>
              {submitting ? (
                <>
                  <LoaderCircle className="animate-spin" /> Opening checkout…
                </>
              ) : (
                <>
                  {mode === "demo" ? "Continue to demo checkout" : "Continue to secure checkout"} <ArrowRight />
                </>
              )}
            </Button>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              {mode === "demo" ? "Demo mode: checkout is simulated — no card is charged and no money moves." : "You'll pay on Stripe's hosted checkout. We never see your card details."}
            </p>
            {!signedIn && (
              <p className="flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand" />
                <span>
                  Tip:{" "}
                  <Link href={`/login?next=${encodeURIComponent("/claim")}`} className="font-semibold text-foreground underline">
                    sign in
                  </Link>{" "}
                  first to see this listing in your dashboard. Upgrades always require verifying ownership.
                </span>
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 flex gap-2 px-1 text-xs leading-relaxed text-subtle">
          <Trophy className="mt-0.5 size-3.5 shrink-0" /> {disclosure}
        </p>
      </aside>
    </ActionForm>
  );
}

function Step({ n, title, description, children }: { n: number; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby={`step-${n}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground font-display text-xs font-bold text-background">{n}</span>
        <div>
          <h2 id={`step-${n}`} className="font-sans text-base font-bold">
            {title}
          </h2>
          <p className="text-[13px] text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="truncate text-right font-medium">{children}</dd>
    </div>
  );
}

function Alert({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-2 rounded-xl border p-3 text-[13px] leading-relaxed", tone === "danger" ? "border-danger/25 bg-danger-soft text-danger" : "border-warning/30 bg-warning-soft text-foreground")}>
      {tone === "danger" ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />}
      <div>{children}</div>
    </div>
  );
}

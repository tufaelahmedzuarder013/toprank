import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, CreditCard, Eye, Link2, Scale, ShieldCheck, Trophy, Zap } from "lucide-react";
import type { RankingRules } from "@/config/defaults";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ListingLogo } from "@/components/board/listing-logo";
import { formatUsd } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, children, align = "left" }: { eyebrow: string; title: string; children?: React.ReactNode; align?: "left" | "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-bold tracking-[0.14em] text-brand-ink uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

export function HowItWorksSection({ rules }: { rules: RankingRules }) {
  const steps = [
    { icon: Link2, title: "Submit your link", text: "Paste a website URL or an X handle. We pull in the name, description and icon automatically — edit anything you like." },
    { icon: CreditCard, title: "Choose your amount", text: `Start from ${formatUsd(rules.minAmount)}. Taking #1 needs the current #1 total plus ${formatUsd(rules.topIncrement)}. You'll see your estimated position as you type.` },
    { icon: Trophy, title: "Go live instantly", text: "Pay through secure hosted checkout. The moment your payment is confirmed, your listing appears at its final position." },
  ];
  return (
    <section aria-labelledby="hiw" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading eyebrow="How it works" title="Three steps to the board">
          One transparent rule decides every position: the highest confirmed total ranks first.
        </SectionHeading>
        <Link href="/how-it-works" id="hiw" className="text-sm font-semibold text-brand-ink hover:underline">
          Read the full guide <ArrowRight className="inline size-4" />
        </Link>
      </div>
      <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="absolute top-5 right-5 font-display text-5xl leading-none font-extrabold text-surface-3 select-none" aria-hidden>
              {i + 1}
            </span>
            <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-ink">
              <s.icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WhySection() {
  const reasons = [
    { icon: Eye, title: "Visibility on day one", text: "No waiting for upvotes or algorithms. Your listing is visible the moment payment is confirmed." },
    { icon: Scale, title: "One rule, for everyone", text: "Rank is decided by confirmed totals only. Ties go to whoever got there first." },
    { icon: CalendarDays, title: "Three boards, one payment", text: "Every payment counts on the all-time, today and category boards at once." },
    { icon: BadgeCheck, title: "Owner-only upgrades", text: "Verify your domain once, then climb by paying just the difference. Nobody else can take over your listing." },
    { icon: ShieldCheck, title: "Secure, hosted checkout", text: "Payments run on our provider's hosted checkout — we never see or store card details." },
    { icon: Zap, title: "Real clicks, tracked", text: "See how many visitors your listing sends, right on your dashboard." },
  ];
  return (
    <section aria-labelledby="why" className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <div id="why">
        <SectionHeading eyebrow="Why list here" title="Built for founders who want to be seen">
          A leaderboard is the simplest marketing channel there is. Here&apos;s what you get.
        </SectionHeading>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {reasons.map((r) => (
          <li key={r.title} className="bg-surface p-6">
            <r.icon className="size-5 text-brand-2-ink" />
            <h3 className="mt-4 font-sans text-[15px] font-bold">{r.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type CategoryOverview = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  count: number;
  leader: { slug: string; name: string; logoUrl: string | null; domain: string; kind: "WEBSITE" | "X_PROFILE"; totalAmount: number } | null;
};

export function CategoryGrid({ categories, limit }: { categories: CategoryOverview[]; limit?: number }) {
  const shown = limit ? categories.slice(0, limit) : categories;
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((c) => (
        <li key={c.id}>
          <Link href={`/categories/${c.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-foreground transition-colors group-hover:bg-brand-soft group-hover:text-brand-ink">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <span className="text-xs font-semibold text-subtle">{c.count.toLocaleString("en-US")} listed</span>
            </div>
            <h3 className="mt-4 font-sans text-[15px] font-bold">{c.name}</h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{c.description}</p>
            <div className="mt-auto pt-4">
              {c.leader ? (
                <span className="flex items-center gap-2 rounded-xl bg-surface-2 px-2.5 py-2">
                  <ListingLogo src={c.leader.logoUrl} name={c.leader.name} kind={c.leader.kind} size={24} />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{c.leader.name}</span>
                  <span className="font-display text-xs font-bold tabular">{formatUsd(c.leader.totalAmount)}</span>
                </span>
              ) : (
                <span className="block rounded-xl border border-dashed border-border-strong px-2.5 py-2 text-xs text-subtle">#1 is open — claim it</span>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink">
                View category <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FinalCta({ heading, text, topClaim }: { heading: string; text: string; topClaim: number }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-foreground px-6 py-12 text-background sm:px-12 sm:py-16">
        <div aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-brand/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-10 size-72 rounded-full bg-brand-2/40 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{heading}</h2>
            <p className="mt-3 text-[15px] leading-relaxed opacity-75">{text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/claim">
                Claim a rank <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="border-white/15 bg-white/10 text-white hover:bg-white/15 dark:border-black/15 dark:bg-black/10 dark:text-black dark:hover:bg-black/15">
              <Link href={`/claim?amount=${topClaim}`}>Take #1 for {formatUsd(topClaim)}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

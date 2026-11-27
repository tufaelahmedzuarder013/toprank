import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/rules", label: "Ranking rules" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function InfoLayout({ eyebrow, title, intro, active, updatedAt, children, cta = true }: { eyebrow: string; title: string; intro?: React.ReactNode; active: string; updatedAt?: Date | null; children: React.ReactNode; cta?: boolean }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Information pages" className="order-2 lg:order-1">
          <ul className="sticky top-24 flex flex-wrap gap-1 lg:flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active === l.href ? "page" : undefined}
                  className={cn("block rounded-lg px-3 py-2 text-sm font-medium transition-colors", active === l.href ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface-2 hover:text-foreground")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="order-1 min-w-0 lg:order-2">
          <p className="text-xs font-bold tracking-wider text-brand-ink uppercase">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {intro && <div className="mt-3 max-w-2xl text-[15px] text-muted">{intro}</div>}
          {updatedAt && <p className="mt-3 text-xs text-subtle">Last updated {updatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</p>}
          <div className="mt-8 max-w-3xl">{children}</div>
          {cta && (
            <div className="mt-12 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <p className="font-semibold">Ready to claim your spot?</p>
              <Button asChild>
                <Link href="/claim">
                  Claim a rank <ArrowRight />
                </Link>
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

export function MarkdownPage({ eyebrow, active, page, cta }: { eyebrow: string; active: string; page: { title: string; body: string; updatedAt: Date | null }; cta?: boolean }) {
  return (
    <InfoLayout eyebrow={eyebrow} title={page.title} active={active} updatedAt={page.updatedAt} cta={cta}>
      <Markdown source={page.body} />
    </InfoLayout>
  );
}

import Link from "next/link";
import { getSettings } from "@/server/settings";
import { paymentMode } from "@/server/payment-provider";
import { Logo } from "./logo";

const columns = [
  {
    title: "Leaderboards",
    links: [
      { href: "/", label: "All-time" },
      { href: "/today", label: "Today" },
      { href: "/daily", label: "Daily archive" },
      { href: "/categories", label: "Categories" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/rules", label: "Ranking rules" },
      { href: "/faq", label: "FAQ" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/dashboard", label: "Your dashboard" },
    ],
  },
];

export async function Footer() {
  const s = await getSettings();
  const year = new Date().getUTCFullYear();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm space-y-4">
          <Logo name={s.brand.name} logoUrl={s.brand.logoUrl} />
          <p className="text-sm leading-relaxed text-muted">{s.brand.description}</p>
          <p className="rounded-xl border border-border bg-surface-2 p-3 text-xs leading-relaxed text-subtle">
            <strong className="font-semibold text-muted">Paid placement disclosure.</strong> {s.disclosure}
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 font-sans text-xs font-semibold tracking-wider text-subtle uppercase">{col.title}</h2>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {s.brand.name}. All rankings are paid placements.
          </p>
          <p>{paymentMode() === "demo" ? "Demo mode · payments are simulated" : "Payments are processed securely by Stripe"}</p>
        </div>
      </div>
    </footer>
  );
}

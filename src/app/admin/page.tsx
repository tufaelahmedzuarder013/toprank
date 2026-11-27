import Link from "next/link";
import { AlertTriangle, ArrowRight, FlaskConical } from "lucide-react";
import { db } from "@/server/db";
import { paymentMode } from "@/server/payment-provider";
import { removeDemoDataAction } from "@/app/actions/admin";
import { addDays, dayWindow, toDateKey, formatDayLabel } from "@/lib/time";
import { StatCard } from "@/components/dashboard/status";
import { ActionButton } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const today = toDateKey();
  const start = dayWindow(addDays(today, -13))!.start;
  const [active, hidden, removed, demoListings, paid, pending, refunds, reviews, messages, users, recent] = await Promise.all([
    db.listing.count({ where: { status: "ACTIVE" } }),
    db.listing.count({ where: { status: "HIDDEN" } }),
    db.listing.count({ where: { status: "REMOVED" } }),
    db.listing.count({ where: { isDemo: true } }),
    db.payment.findMany({ where: { status: "SUCCEEDED", confirmedAt: { gte: start } }, select: { amount: true, confirmedAt: true, isDemo: true } }),
    db.payment.count({ where: { status: "PENDING" } }),
    db.payment.count({ where: { status: "FAILED", failureReason: { startsWith: "REFUND_REQUIRED" } } }),
    db.ownershipClaim.count({ where: { method: "MANUAL", verifiedAt: null } }),
    db.contactMessage.count({ where: { handled: false } }),
    db.user.count(),
    db.payment.findMany({ where: { status: "SUCCEEDED" }, orderBy: { confirmedAt: "desc" }, take: 8, include: { listing: { select: { name: true, slug: true } } } }),
  ]);
  const totals = await db.payment.groupBy({ by: ["isDemo"], where: { status: "SUCCEEDED" }, _sum: { amount: true } });
  const demoPayments = await db.payment.count({ where: { isDemo: true } });
  const [confirmedCount, clickSum, totalListings] = await Promise.all([
    db.payment.groupBy({ by: ["isDemo"], where: { status: "SUCCEEDED" }, _count: { _all: true } }),
    db.listing.aggregate({ _sum: { clicks: true } }),
    db.listing.count({ where: { status: { not: "PENDING" } } }),
  ]);
  const realCount = confirmedCount.find((c) => !c.isDemo)?._count._all ?? 0;
  const demoCount = confirmedCount.find((c) => c.isDemo)?._count._all ?? 0;
  const real = totals.find((t) => !t.isDemo)?._sum.amount ?? 0;
  const demo = totals.find((t) => t.isDemo)?._sum.amount ?? 0;

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const series = days.map((d) => {
    const w = dayWindow(d)!;
    const inDay = paid.filter((p) => p.confirmedAt && p.confirmedAt >= w.start && p.confirmedAt < w.end);
    return { day: d, real: inDay.filter((p) => !p.isDemo).reduce((s, p) => s + p.amount, 0), demo: inDay.filter((p) => p.isDemo).reduce((s, p) => s + p.amount, 0) };
  });
  const max = Math.max(1, ...series.map((s) => s.real + s.demo));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Payments: {paymentMode() === "demo" ? "demo mode (simulated)" : "Stripe"}</p>
        </div>
      </div>

      {(refunds > 0 || reviews > 0 || messages > 0) && (
        <div className="flex flex-wrap gap-2">
          {refunds > 0 && (
            <Link href="/admin/payments?status=refund" className="inline-flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-warning" /> {refunds} refund{refunds === 1 ? "" : "s"} need attention <ArrowRight className="size-3.5" />
            </Link>
          )}
          {reviews > 0 && (
            <Link href="/admin/ownership" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium">
              {reviews} ownership review{reviews === 1 ? "" : "s"} <ArrowRight className="size-3.5" />
            </Link>
          )}
          {messages > 0 && (
            <Link href="/admin/messages" className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium">
              {messages} unread message{messages === 1 ? "" : "s"} <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard label="Revenue (real payments)" value={formatUsd(real)} hint={`${realCount} confirmed payment${realCount === 1 ? "" : "s"}`} />
        <StatCard label="Demo volume" value={formatUsd(demo)} hint={<Badge tone="violet">{demoCount} demo payments — not revenue</Badge>} />
        <StatCard label="Total listings" value={totalListings} hint={`${active} active · ${hidden} hidden · ${removed} removed`} />
        <StatCard label="Outgoing clicks" value={(clickSum._sum.clicks ?? 0).toLocaleString("en-US")} hint={demoListings ? "includes demo listings' sample clicks" : "all listings"} />
        <StatCard label="Users" value={users} />
        <StatCard label="Checkouts in progress" value={pending} hint="pending payments" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans text-[15px] font-bold">Confirmed payments · last 14 days (UTC)</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand" /> Real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand-2/50" /> Demo
            </span>
          </div>
        </div>
        <div className="mt-5 flex h-40 items-end gap-1.5" role="img" aria-label="Bar chart of confirmed payments per day">
          {series.map((s) => (
            <div key={s.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDayLabel(s.day)}: ${formatUsd(s.real)} real, ${formatUsd(s.demo)} demo`}>
              <div className="rounded-t-[3px] bg-brand-2/50" style={{ height: `${(s.demo / max) * 100}%` }} />
              <div className="bg-brand" style={{ height: `${(s.real / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-subtle">
          <span>{formatDayLabel(days[0], { month: "short", day: "numeric" })}</span>
          <span>Today</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="border-b border-border px-5 py-3.5 font-sans text-[15px] font-bold">Latest confirmed payments</h2>
          <ul className="divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <Link href={`/p/${p.listing.slug}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {p.listing.name}
                </Link>
                {p.isDemo && <Badge tone="violet">Demo</Badge>}
                <span className="font-semibold tabular">{formatUsd(p.amount)}</span>
              </li>
            ))}
            {!recent.length && <li className="px-5 py-4 text-sm text-muted">No payments yet.</li>}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-sans text-[15px] font-bold">
            <FlaskConical className="size-4 text-brand-2" /> Demo data
          </h2>
          <p className="mt-1 text-sm text-muted">
            {demoListings ? `${demoListings} sample listings (marked “Demo”) and their simulated payments are on the board.` : "No seeded sample listings are present."} This also removes listings bought through the simulated checkout. Remove them before launch — real listings, users and settings are kept.
          </p>
          {(demoListings > 0 || demoPayments > 0) && (
            <ActionButton action={removeDemoDataAction} confirm="Click again to remove all demo data" variant="danger" size="sm" className="mt-4">
              Remove demo data
            </ActionButton>
          )}
        </Card>
      </div>
    </div>
  );
}

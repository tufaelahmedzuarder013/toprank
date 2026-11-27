import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { markRefundedAction, retryRefundAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/admin-ui";
import { Pagination } from "@/components/board/board-ui";
import { PaymentStatus } from "@/components/dashboard/status";
import { Badge } from "@/components/ui/badge";
import { cn, formatUsd } from "@/lib/utils";

export const metadata = { title: "Payments" };
const PAGE = 40;
const FILTERS = [
  { key: "", label: "All" },
  { key: "SUCCEEDED", label: "Succeeded" },
  { key: "PENDING", label: "Pending" },
  { key: "refund", label: "Refund due" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELED", label: "Cancelled" },
  { key: "EXPIRED", label: "Expired" },
] as const;

export default async function AdminPayments({ searchParams }: PageProps<"/admin/payments">) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const showDemo = sp.demo !== "hide";
  const where: Prisma.PaymentWhereInput = {
    ...(filter === "refund" ? { status: "FAILED", failureReason: { startsWith: "REFUND_REQUIRED" } } : filter ? { status: filter } : {}),
    ...(showDemo ? {} : { isDemo: false }),
  };
  const [count, rows] = await Promise.all([db.payment.count({ where }), db.payment.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { listing: { select: { name: true, id: true } }, user: { select: { email: true } } } })]);
  const href = (p: number, f = filter, d = showDemo) => `/admin/payments?${new URLSearchParams({ ...(f ? { status: f } : {}), ...(d ? {} : { demo: "hide" }), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Payments</h1>
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f.key} href={href(1, f.key)} className={cn("rounded-full border px-3 py-1 text-[13px] font-semibold", filter === f.key ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted hover:text-foreground")}>
            {f.label}
          </Link>
        ))}
        <Link href={href(1, filter, !showDemo)} className="ml-auto text-[13px] font-semibold text-brand-ink hover:underline">
          {showDemo ? "Hide demo payments" : "Show demo payments"}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-subtle">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Created (UTC)</th>
              <th className="px-4 py-2.5 font-semibold">Listing</th>
              <th className="px-4 py-2.5 font-semibold">Type</th>
              <th className="px-4 py-2.5 font-semibold">Amount</th>
              <th className="px-4 py-2.5 font-semibold">Rank est. → final</th>
              <th className="px-4 py-2.5 font-semibold">Provider</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => {
              const refundDue = p.status === "FAILED" && p.failureReason?.startsWith("REFUND_REQUIRED");
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted">{p.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/listings/${p.listing.id}`} className="font-medium hover:underline">
                      {p.listing.name}
                    </Link>
                    <span className="block max-w-48 truncate text-xs text-subtle">{p.user?.email ?? "guest"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{p.kind === "UPGRADE" ? `Upgrade ${formatUsd(p.previousTotal)}→${formatUsd(p.targetTotal)}` : "New"}</td>
                  <td className="px-4 py-2.5 font-semibold tabular">{formatUsd(p.amount)}</td>
                  <td className="px-4 py-2.5 text-muted">
                    #{p.estimatedRank ?? "?"} → {p.finalRank ? `#${p.finalRank}` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.isDemo ? <Badge tone="violet">Demo</Badge> : <span className="font-mono text-[11px] text-subtle">{p.providerPaymentId ?? p.providerSessionId?.slice(0, 18) ?? "stripe"}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <PaymentStatus status={p.status} failureReason={p.failureReason} />
                    {p.failureReason && <span className="mt-0.5 block max-w-56 truncate text-[11px] text-subtle" title={p.failureReason}>{p.failureReason}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {refundDue && (
                      <div className="flex justify-end gap-1.5">
                        <ActionButton action={retryRefundAction.bind(null, p.id)} success="Refund attempted">Retry refund</ActionButton>
                        <ActionButton action={markRefundedAction.bind(null, p.id)} confirm="Confirm" success="Marked refunded">Mark refunded</ActionButton>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No payments.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={Math.ceil(count / PAGE)} hrefFor={(p) => href(p)} />
      <p className="text-xs text-subtle">“Refund due” means a payment was captured after its link was taken by another checkout (or its listing was removed). Stripe refunds are attempted automatically; retry here or refund in the Stripe Dashboard and mark it refunded.</p>
    </div>
  );
}

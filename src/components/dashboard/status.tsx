import { Badge } from "@/components/ui/badge";

const paymentTone = { PENDING: "warning", SUCCEEDED: "success", FAILED: "danger", CANCELED: "neutral", EXPIRED: "neutral", REFUNDED: "violet" } as const;
const listingTone = { PENDING: "warning", ACTIVE: "success", HIDDEN: "neutral", REMOVED: "danger" } as const;

export function PaymentStatus({ status, failureReason }: { status: keyof typeof paymentTone; failureReason?: string | null }) {
  const refundDue = status === "FAILED" && failureReason?.startsWith("REFUND_REQUIRED");
  return (
    <Badge tone={refundDue ? "violet" : paymentTone[status]} title={failureReason ?? undefined}>
      {refundDue ? "Refund due" : status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

export function ListingStatus({ status }: { status: keyof typeof listingTone }) {
  return <Badge tone={listingTone[status]}>{status === "PENDING" ? "Awaiting payment" : status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold text-subtle">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight tabular">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
    </div>
  );
}

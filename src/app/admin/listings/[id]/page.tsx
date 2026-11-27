import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { db } from "@/server/db";
import { adminUpdateListingAction, revokeOwnershipAction, setListingStatusAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/admin-ui";
import { EditListingForm } from "@/components/dashboard/edit-listing-form";
import { ListingLogo } from "@/components/board/listing-logo";
import { ListingStatus, PaymentStatus } from "@/components/dashboard/status";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils";

export const metadata = { title: "Listing" };

export default async function AdminListing({ params }: PageProps<"/admin/listings/[id]">) {
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id }, include: { owner: { select: { email: true, name: true } }, createdBy: { select: { email: true } }, payments: { orderBy: { createdAt: "desc" }, take: 50 } } });
  if (!listing) notFound();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <Link href="/admin/listings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Listings
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <ListingLogo src={listing.logoUrl} name={listing.name} kind={listing.kind} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{listing.name}</h1>
          <a href={listing.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            {listing.url} <ExternalLink className="size-3.5" />
          </a>
        </div>
        <ListingStatus status={listing.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        {listing.status === "ACTIVE" && <ActionButton action={setListingStatusAction.bind(null, listing.id, "HIDDEN")} size="sm">Hide from boards</ActionButton>}
        {(listing.status === "HIDDEN" || listing.status === "REMOVED") && <ActionButton action={setListingStatusAction.bind(null, listing.id, "ACTIVE")} size="sm">Restore</ActionButton>}
        {listing.status !== "REMOVED" && listing.status !== "PENDING" && (
          <ActionButton action={setListingStatusAction.bind(null, listing.id, "REMOVED")} size="sm" variant="danger" confirm="Click again to remove">
            Remove & block link
          </ActionButton>
        )}
        {listing.status === "ACTIVE" && (
          <Link href={`/p/${listing.slug}`} className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold text-muted hover:bg-surface-2 hover:text-foreground">
            Public page →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5">
          <h2 className="mb-4 font-sans text-[15px] font-bold">Details</h2>
          <EditListingForm listing={{ id: listing.id, name: listing.name, description: listing.description, logoUrl: listing.logoUrl, categoryId: listing.categoryId }} categories={categories} action={adminUpdateListingAction} />
        </Card>
        <Card className="space-y-3 p-5 text-sm">
          <h2 className="font-sans text-[15px] font-bold">Facts</h2>
          <Fact label="Total">{formatUsd(listing.totalAmount)}</Fact>
          <Fact label="Clicks">{listing.clicks.toLocaleString("en-US")}</Fact>
          <Fact label="Created by">{listing.createdBy?.email ?? "guest checkout"}</Fact>
          <Fact label="Verified owner">{listing.owner ? `${listing.owner.name} (${listing.owner.email})` : "none"}</Fact>
          <Fact label="Confirmed">{listing.confirmedAt?.toISOString().slice(0, 16).replace("T", " ") ?? "—"} UTC</Fact>
          <Fact label="Demo">{listing.isDemo ? "yes" : "no"}</Fact>
          {listing.ownerId && (
            <ActionButton action={revokeOwnershipAction.bind(null, listing.id)} variant="danger-ghost" confirm="Confirm revoke" success="Ownership revoked">
              Revoke ownership
            </ActionButton>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="border-b border-border px-5 py-3.5 font-sans text-[15px] font-bold">Payments</h2>
        <ul className="divide-y divide-border">
          {listing.payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
              <span className="w-36 text-xs text-muted">{p.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              <span className="flex-1">
                {p.kind === "UPGRADE" ? "Upgrade" : "New listing"} · <strong className="tabular">{formatUsd(p.amount)}</strong> · {p.provider.toLowerCase()}
                {p.finalRank ? ` · #${p.finalRank}` : ""}
              </span>
              <PaymentStatus status={p.status} failureReason={p.failureReason} />
            </li>
          ))}
          {!listing.payments.length && <li className="px-5 py-4 text-muted">No payments.</li>}
        </ul>
      </Card>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="truncate text-right font-medium">{children}</span>
    </div>
  );
}

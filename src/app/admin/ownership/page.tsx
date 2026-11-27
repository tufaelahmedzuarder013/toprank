import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/server/db";
import { approveOwnershipAction, rejectOwnershipAction } from "@/app/actions/admin";
import { bioCode } from "@/lib/verification";
import { ActionButton } from "@/components/admin/admin-ui";
import { ListingLogo } from "@/components/board/listing-logo";
import { EmptyState } from "@/components/board/board-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Ownership" };

export default async function AdminOwnership() {
  const [queue, verified] = await Promise.all([
    db.ownershipClaim.findMany({ where: { method: "MANUAL", verifiedAt: null }, orderBy: { createdAt: "asc" }, include: { listing: { select: { id: true, name: true, url: true, domain: true, logoUrl: true, kind: true, ownerId: true } }, user: { select: { email: true, name: true } } } }),
    db.ownershipClaim.findMany({ where: { verifiedAt: { not: null } }, orderBy: { verifiedAt: "desc" }, take: 20, include: { listing: { select: { id: true, name: true } }, user: { select: { email: true } } } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Ownership reviews</h1>
        <p className="text-sm text-muted">Manual requests (mostly X profiles). Open the profile, check the bio contains the code, then approve.</p>
      </div>
      {queue.length ? (
        <ul className="space-y-3">
          {queue.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-4 p-4">
                <ListingLogo src={c.listing.logoUrl} name={c.listing.name} kind={c.listing.kind} size={40} />
                <div className="min-w-0 flex-1 text-sm">
                  <Link href={`/admin/listings/${c.listing.id}`} className="font-semibold hover:underline">
                    {c.listing.name}
                  </Link>
                  <a href={c.listing.url} target="_blank" rel="noopener noreferrer nofollow" className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground">
                    {c.listing.domain} <ExternalLink className="size-3" />
                  </a>
                  <p className="text-xs text-muted">
                    Requested by {c.user.name} ({c.user.email}) · expected code <code className="rounded bg-surface-2 px-1 font-mono text-foreground">{bioCode(c.token)}</code>
                    {c.listing.ownerId && <Badge tone="warning" className="ml-2">Has an owner — approving transfers it</Badge>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionButton action={approveOwnershipAction.bind(null, c.id)} variant="primary" success="Ownership approved">
                    Approve
                  </ActionButton>
                  <ActionButton action={rejectOwnershipAction.bind(null, c.id)} variant="danger-ghost" confirm="Confirm reject" success="Request rejected">
                    Reject
                  </ActionButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={ShieldCheck} title="No pending reviews">
          Website owners verify automatically via DNS, meta tag or file.
        </EmptyState>
      )}
      <Card>
        <h2 className="border-b border-border px-5 py-3.5 font-sans text-[15px] font-bold">Recently verified</h2>
        <ul className="divide-y divide-border text-sm">
          {verified.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
              <Link href={`/admin/listings/${v.listing.id}`} className="font-medium hover:underline">
                {v.listing.name}
              </Link>
              <span className="text-muted">{v.user.email}</span>
              <Badge className="ml-auto">{v.method?.toLowerCase()}</Badge>
            </li>
          ))}
          {!verified.length && <li className="px-5 py-4 text-muted">Nobody has verified yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

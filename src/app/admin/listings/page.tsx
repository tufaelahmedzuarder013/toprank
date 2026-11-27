import Link from "next/link";
import Form from "next/form";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { setListingStatusAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/admin-ui";
import { ListingLogo } from "@/components/board/listing-logo";
import { Pagination } from "@/components/board/board-ui";
import { ListingStatus } from "@/components/dashboard/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldBase, NativeSelect } from "@/components/ui/input";
import { cn, formatUsd } from "@/lib/utils";

export const metadata = { title: "Listings" };
const PAGE = 30;
const STATUSES = ["ACTIVE", "HIDDEN", "REMOVED", "PENDING"] as const;

export default async function AdminListings({ searchParams }: PageProps<"/admin/listings">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.ListingWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [count, rows] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({ where, orderBy: [{ totalAmount: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE, include: { category: { select: { name: true } }, owner: { select: { email: true } } } }),
  ]);
  const qs = (p: number) => `/admin/listings?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Listings</h1>
      <Form action="/admin/listings" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, domain or slug" aria-label="Search listings" className={cn(fieldBase, "h-10 max-w-xs px-3")} />
        <div className="w-40">
          <NativeSelect name="status" defaultValue={status ?? ""} aria-label="Status" className="h-10">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary" className="h-10">
          Filter
        </Button>
      </Form>
      <p className="text-xs text-subtle">{count} listings</p>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-subtle">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Listing</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Total</th>
              <th className="px-4 py-2.5 font-semibold">Owner</th>
              <th className="px-4 py-2.5 text-right font-semibold">Moderation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((l) => (
              <tr key={l.id} className="align-middle">
                <td className="px-4 py-3">
                  <Link href={`/admin/listings/${l.id}`} className="flex items-center gap-3 hover:underline">
                    <ListingLogo src={l.logoUrl} name={l.name} kind={l.kind} size={32} />
                    <span className="min-w-0">
                      <span className="block max-w-56 truncate font-semibold">{l.name}</span>
                      <span className="block max-w-56 truncate text-xs text-subtle">{l.domain}</span>
                    </span>
                    {l.isDemo && <Badge tone="violet">Demo</Badge>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{l.category.name}</td>
                <td className="px-4 py-3">
                  <ListingStatus status={l.status} />
                </td>
                <td className="px-4 py-3 font-semibold tabular">{formatUsd(l.totalAmount)}</td>
                <td className="max-w-40 truncate px-4 py-3 text-xs text-muted">{l.owner?.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {l.status === "ACTIVE" && <ActionButton action={setListingStatusAction.bind(null, l.id, "HIDDEN")} success="Listing hidden">Hide</ActionButton>}
                    {(l.status === "HIDDEN" || l.status === "REMOVED") && <ActionButton action={setListingStatusAction.bind(null, l.id, "ACTIVE")} success="Listing restored">Restore</ActionButton>}
                    {l.status !== "REMOVED" && l.status !== "PENDING" && (
                      <ActionButton action={setListingStatusAction.bind(null, l.id, "REMOVED")} variant="danger-ghost" confirm="Confirm remove" success="Listing removed">
                        Remove
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No listings match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={Math.ceil(count / PAGE)} hrefFor={qs} />
      <p className="text-xs text-subtle">Hidden listings disappear from public boards but keep their payments and can be restored. Removed listings also block the link from being claimed again.</p>
    </div>
  );
}

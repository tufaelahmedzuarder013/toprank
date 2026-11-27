import Form from "next/form";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { setUserRoleAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fieldBase } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const q = typeof (await searchParams).q === "string" ? String((await searchParams).q).trim().slice(0, 80) : "";
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { ownedListings: true, payments: true } } },
  });
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight">Users</h1>
      <Form action="/admin/users" className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email or name" aria-label="Search users" className={cn(fieldBase, "h-10 max-w-xs px-3")} />
        <Button type="submit" variant="secondary" className="h-10">
          Search
        </Button>
      </Form>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs text-subtle">
            <tr>
              <th className="px-4 py-2.5 font-semibold">User</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 font-semibold">Owned</th>
              <th className="px-4 py-2.5 font-semibold">Payments</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">
                  <span className="block font-medium">{u.name}</span>
                  <span className="block text-xs text-subtle">{u.email}</span>
                </td>
                <td className="px-4 py-2.5 text-muted">{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-2.5 tabular">{u._count.ownedListings}</td>
                <td className="px-4 py-2.5 tabular">{u._count.payments}</td>
                <td className="px-4 py-2.5">{u.role === "ADMIN" ? <Badge tone="brand">Admin</Badge> : <Badge>User</Badge>}</td>
                <td className="px-4 py-2.5 text-right">
                  {u.id !== me.id &&
                    (u.role === "ADMIN" ? (
                      <ActionButton action={setUserRoleAction.bind(null, u.id, "USER")} confirm="Confirm demote" success="Role updated">
                        Make user
                      </ActionButton>
                    ) : (
                      <ActionButton action={setUserRoleAction.bind(null, u.id, "ADMIN")} confirm="Confirm promote" success="Role updated">
                        Make admin
                      </ActionButton>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

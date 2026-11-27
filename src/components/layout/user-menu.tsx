"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { hueFor, initials } from "@/lib/utils";

export function UserMenu({ user }: { user: { name: string; email: string; role: "USER" | "ADMIN" } }) {
  const hue = hueFor(user.email);
  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-surface-2";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Account menu"
        className="grid size-9 place-items-center rounded-full text-[13px] font-bold text-white ring-2 ring-transparent transition hover:ring-border-strong"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 56%), hsl(${(hue + 50) % 360} 70% 46%))` }}
      >
        {initials(user.name)}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-fade-in">
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild>
            <Link href="/dashboard" className={item}>
              <LayoutDashboard className="size-4 text-muted" /> Dashboard
            </Link>
          </DropdownMenu.Item>
          {user.role === "ADMIN" && (
            <DropdownMenu.Item asChild>
              <Link href="/admin" className={item}>
                <ShieldCheck className="size-4 text-muted" /> Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <form action={logoutAction}>
            <DropdownMenu.Item asChild>
              <button type="submit" className={item}>
                <LogOut className="size-4 text-muted" /> Sign out
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mainNav } from "./nav-config";
import { logoutAction } from "@/app/actions/auth";

export function MobileMenu({ user, siteName }: { user: { name: string; role: "USER" | "ADMIN" } | null; siteName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  const links = [...mainNav, { href: "/daily", label: "Daily Archive", match: (p: string) => p.startsWith("/daily") }, { href: "/faq", label: "FAQ", match: (p: string) => p === "/faq" }, { href: "/rules", label: "Rules", match: (p: string) => p === "/rules" }, { href: "/contact", label: "Contact", match: (p: string) => p === "/contact" }];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label="Open menu" className="grid size-9 place-items-center rounded-xl text-foreground transition-colors hover:bg-surface-2 lg:hidden">
        <Menu className="size-5" />
      </DialogTrigger>
      <DialogContent side="right" className="flex flex-col p-0">
        <div className="border-b border-border px-5 py-4">
          <DialogTitle className="font-display text-base font-bold">{siteName}</DialogTitle>
          <DialogDescription className="text-xs text-subtle">Menu</DialogDescription>
        </div>
        <nav aria-label="Mobile" className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {links.map((l) => {
              const active = l.match(pathname);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center rounded-xl px-3 py-2.5 text-[15px] font-medium", active ? "bg-brand-soft text-brand-ink" : "text-foreground hover:bg-surface-2")}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/search" onClick={close} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[15px] font-medium text-foreground hover:bg-surface-2">
                <Search className="size-4 text-muted" /> Search
              </Link>
            </li>
          </ul>
        </nav>
        <div className="space-y-2 border-t border-border p-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/claim" onClick={close}>
              <Trophy /> Claim a Rank
            </Link>
          </Button>
          {user ? (
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary">
                <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={close}>
                  {user.role === "ADMIN" ? "Admin" : "Dashboard"}
                </Link>
              </Button>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" className="w-full">
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <Link href="/login" onClick={close}>
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

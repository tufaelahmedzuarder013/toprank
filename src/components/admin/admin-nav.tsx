"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileText, Gauge, Inbox, LayoutList, Settings, ShieldCheck, Tags, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Overview", icon: Gauge, exact: true },
  { href: "/admin/listings", label: "Listings", icon: LayoutList },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/ownership", label: "Ownership", icon: ShieldCheck },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/content", label: "Pages & FAQ", icon: FileText },
  { href: "/admin/messages", label: "Messages", icon: Inbox },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {items.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        const count = badges[i.href] ?? 0;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors", active ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface-2 hover:text-foreground")}
          >
            <i.icon className="size-4" />
            <span className="flex-1">{i.label}</span>
            {count > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-fg">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

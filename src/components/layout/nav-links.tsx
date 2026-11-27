"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mainNav } from "./nav-config";

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      {mainNav.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {item.label}
            {active && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}

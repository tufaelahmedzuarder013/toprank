import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { AdminNav } from "@/components/admin/admin-nav";
import { DemoBanner } from "@/components/layout/demo-banner";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const [settings, reviews, messages, refunds] = await Promise.all([
    getSettings(),
    db.ownershipClaim.count({ where: { method: "MANUAL", verifiedAt: null } }),
    db.contactMessage.count({ where: { handled: false } }),
    db.payment.count({ where: { status: "FAILED", failureReason: { startsWith: "REFUND_REQUIRED" } } }),
  ]);
  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo name={settings.brand.name} logoUrl={settings.brand.logoUrl} />
          <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-background uppercase">Admin</span>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/" className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground sm:inline-flex">
              View site <ExternalLink className="size-3.5" />
            </Link>
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <AdminNav badges={{ "/admin/ownership": reviews, "/admin/messages": messages, "/admin/payments": refunds }} />
        </aside>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

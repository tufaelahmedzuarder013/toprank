import Link from "next/link";
import { Trophy } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { getSettings } from "@/server/settings";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { SearchDialog } from "./search-dialog";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo name={settings.brand.name} logoUrl={settings.brand.logoUrl} className="mr-2" />
        <NavLinks />
        <div className="ml-auto flex items-center gap-1">
          <SearchDialog />
          <ThemeToggle />
          {user ? (
            <span className="ml-1 hidden sm:block">
              <UserMenu user={user} />
            </span>
          ) : (
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground sm:block">
              Sign in
            </Link>
          )}
          <Button asChild size="sm" className="ml-1 hidden h-9 min-[400px]:inline-flex">
            <Link href="/claim">
              <Trophy className="size-4" />
              <span className="sm:hidden">Claim</span>
              <span className="hidden sm:inline">Claim a Rank</span>
            </Link>
          </Button>
          <MobileMenu user={user ? { name: user.name, role: user.role } : null} siteName={settings.brand.name} />
        </div>
      </div>
    </header>
  );
}

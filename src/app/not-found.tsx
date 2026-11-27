import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-2 text-subtle">
          <Compass className="size-8" />
        </span>
        <p className="mt-6 font-display text-sm font-bold tracking-widest text-brand-ink">404</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">This rung doesn&apos;t exist</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">The page may have moved, or the listing was hidden or removed.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/">Back to the leaderboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">Search</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted">We couldn&apos;t load this page. Please try again in a moment.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => retry()}>
            <RotateCcw /> Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

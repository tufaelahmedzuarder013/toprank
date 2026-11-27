"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CornerDownLeft, LoaderCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListingLogo } from "@/components/board/listing-logo";
import { quickSearchAction, type QuickResult } from "@/app/actions/public";
import { cn, formatUsd } from "@/lib/utils";

export function SearchDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState(0);
  const router = useRouter();
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onChange = (value: string) => {
    setQ(value);
    setActive(0);
    const id = ++seq.current;
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      await new Promise((r) => setTimeout(r, 160));
      if (id !== seq.current) return;
      const res = await quickSearchAction(value);
      if (id === seq.current) setResults(res);
    });
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const term = q.trim();
      if (results[active] && active < results.length) go(`/p/${results[active].slug}`);
      else if (term) go(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setQ("");
          setResults([]);
        }
      }}
    >
      <DialogTrigger
        aria-label="Search listings"
        className={cn("grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground", className)}
      >
        <Search className="size-[18px]" />
      </DialogTrigger>
      <DialogContent side="top" hideClose className="overflow-hidden p-0">
        <DialogTitle className="sr-only">Search the leaderboard</DialogTitle>
        <DialogDescription className="sr-only">Type a product name, domain or category.</DialogDescription>
        <div className="flex items-center gap-3 border-b border-border px-4">
          {pending ? <LoaderCircle className="size-5 shrink-0 animate-spin text-subtle" /> : <Search className="size-5 shrink-0 text-subtle" />}
          <input
            autoFocus
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search products, domains, categories…"
            aria-label="Search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="quick-search-results"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-subtle sm:block">Esc</kbd>
        </div>
        <ul id="quick-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {results.map((r, i) => (
            <li key={r.slug} role="option" aria-selected={i === active}>
              <Link
                href={`/p/${r.slug}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", i === active && "bg-surface-2")}
              >
                <ListingLogo src={r.logoUrl} name={r.name} kind={r.kind} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="block truncate text-xs text-subtle">
                    {r.domain} · {r.category}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-semibold text-muted">#{r.rank}</span>
                  <span className="block font-display text-sm font-bold tabular">{formatUsd(r.amount)}</span>
                </span>
              </Link>
            </li>
          ))}
          {q.trim().length >= 2 && (
            <li role="option" aria-selected={active === results.length}>
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
                onMouseEnter={() => setActive(results.length)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted", active === results.length && "bg-surface-2 text-foreground")}
              >
                <ArrowRight className="size-4" />
                <span className="min-w-0 flex-1 truncate">
                  See all results for <strong className="text-foreground">“{q.trim()}”</strong>
                </span>
                <CornerDownLeft className="size-3.5 text-subtle" />
              </button>
            </li>
          )}
          {q.trim().length < 2 && <li className="px-3 py-6 text-center text-sm text-subtle">Start typing to search the board. Tip: press <kbd className="font-mono">/</kbd> anywhere.</li>}
          {q.trim().length >= 2 && !pending && results.length === 0 && <li className="px-3 pt-4 pb-2 text-center text-sm text-subtle">No quick matches.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

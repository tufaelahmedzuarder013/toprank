"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Whole-dollar amount input with −/+ buttons (Shift = ±10). */
export function AmountStepper({
  value,
  onChange,
  min,
  max,
  id,
  name,
  invalid,
  describedBy,
  size = "md",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  id?: string;
  name?: string;
  invalid?: boolean;
  describedBy?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const n = Number(value);
  const valid = Number.isFinite(n) && value.trim() !== "";
  const step = (dir: 1 | -1, e: React.MouseEvent) => {
    const by = e.shiftKey ? 10 : 1;
    const base = valid ? Math.floor(n) : min;
    onChange(String(Math.min(max, Math.max(min, base + dir * by))));
  };
  const h = size === "lg" ? "h-12" : "h-11";
  return (
    <div
      className={cn(
        "flex min-w-0 items-stretch overflow-hidden rounded-xl border bg-surface shadow-sm transition-[border-color,box-shadow] focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15",
        invalid ? "border-danger" : "border-border hover:border-border-strong",
        h,
        className,
      )}
    >
      <button type="button" onClick={(e) => step(-1, e)} disabled={valid && n <= min} aria-label="Decrease amount" className="grid w-10 shrink-0 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40">
        <Minus className="size-4" />
      </button>
      <div className="relative flex min-w-0 flex-1 items-center border-x border-border">
        <span className="pointer-events-none absolute left-3 font-display text-base font-bold text-subtle">$</span>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-label="Amount in US dollars"
          className={cn("h-full w-full min-w-0 bg-transparent pr-2 pl-7 font-display font-bold tabular outline-none", size === "lg" ? "text-xl" : "text-lg")}
        />
      </div>
      <button type="button" onClick={(e) => step(1, e)} disabled={valid && n >= max} aria-label="Increase amount" className="grid w-10 shrink-0 place-items-center text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const medal: Record<number, string> = {
  1: "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--gold)_95%,white),var(--gold))] text-[#3d2a00] shadow-[0_4px_14px_-4px_var(--gold)]",
  2: "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--silver)_75%,white),var(--silver))] text-[#1f2633] shadow-[0_4px_14px_-6px_var(--silver)]",
  3: "bg-[linear-gradient(140deg,color-mix(in_oklab,var(--bronze)_80%,white),var(--bronze))] text-[#3b1d08] shadow-[0_4px_14px_-6px_var(--bronze)]",
};

export function RankBadge({ rank, size = "md", className }: { rank: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = size === "lg" ? "size-12 text-lg rounded-2xl" : size === "sm" ? "size-7 text-xs rounded-lg" : "size-9 text-sm rounded-xl";
  const top = rank <= 3;
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center font-display font-extrabold tabular", dims, top ? medal[rank] : "border border-border bg-surface-2 text-muted", className)}
      aria-label={`Rank ${rank}`}
    >
      {rank === 1 && size !== "sm" && <Crown className="absolute -top-2.5 left-1/2 size-3.5 -translate-x-1/2 fill-[var(--gold)] text-[var(--gold)]" aria-hidden />}
      {rank > 999 ? "999+" : rank}
    </span>
  );
}

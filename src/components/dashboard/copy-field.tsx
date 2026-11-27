"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyField({ value, label, className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn("flex min-w-0 items-stretch overflow-hidden rounded-xl border border-border bg-surface-2", className)}>
      <code className="min-w-0 flex-1 overflow-x-auto px-3 py-2.5 font-mono text-[12.5px] whitespace-nowrap text-foreground" aria-label={label}>
        {value}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {}
        }}
        className="grid w-11 shrink-0 place-items-center border-l border-border text-muted transition-colors hover:bg-surface hover:text-foreground"
        aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

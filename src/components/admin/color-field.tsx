"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "@/components/ui/input";

export function ColorField({ id, name, defaultValue }: { id: string; name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex gap-2">
      <input type="color" aria-label="Pick colour" value={valid ? value : "#000000"} onChange={(e) => setValue(e.target.value)} className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-border bg-surface p-1" />
      <input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!valid || undefined} spellCheck={false} className={cn(fieldBase, "h-11 px-3.5 font-mono")} />
    </div>
  );
}

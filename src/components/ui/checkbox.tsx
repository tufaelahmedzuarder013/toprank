"use client";

import * as React from "react";
import { Checkbox as C } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[6px] border border-border-strong bg-surface shadow-sm transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-fg aria-invalid:border-danger",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}

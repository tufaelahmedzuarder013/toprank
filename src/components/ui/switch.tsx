"use client";

import * as React from "react";
import { Switch as S } from "radix-ui";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-surface-3 p-0.5 transition-colors data-[state=checked]:bg-brand",
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-[18px] rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4" />
    </S.Root>
  );
}

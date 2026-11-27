import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "border-border bg-surface-2 text-muted",
      brand: "border-brand/25 bg-brand-soft text-brand-ink",
      violet: "border-brand-2/25 bg-brand-2-soft text-brand-2-ink",
      success: "border-success/25 bg-success-soft text-success",
      danger: "border-danger/25 bg-danger-soft text-danger",
      warning: "border-warning/30 bg-warning-soft text-warning",
      outline: "border-border text-muted",
    },
    size: { sm: "h-5 px-2 text-[11px]", md: "h-6 px-2.5 text-xs" },
  },
  defaultVariants: { tone: "neutral", size: "sm" },
});

export function Badge({ className, tone, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

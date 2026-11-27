import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 select-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-brand-solid text-brand-fg shadow-[0_1px_0_rgb(255_255_255/0.25)_inset,0_6px_18px_-6px_var(--brand)] hover:brightness-[1.06]",
        secondary: "border border-border bg-surface text-foreground shadow-sm hover:border-border-strong hover:bg-surface-2",
        ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
        outline: "border border-brand/40 bg-brand-softer text-brand-ink hover:border-brand hover:bg-brand-soft",
        violet: "bg-brand-2-solid text-brand-2-fg shadow-[0_6px_18px_-6px_var(--brand-2)] hover:brightness-110",
        danger: "bg-danger-solid text-white hover:brightness-110",
        "danger-ghost": "text-danger hover:bg-danger-soft",
        link: "h-auto rounded-md px-0 text-brand-ink underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 rounded-lg px-2.5 text-xs",
        sm: "h-8 rounded-lg px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-5 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 rounded-lg",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

export function DialogContent({
  className,
  children,
  side = "center",
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { side?: "center" | "right" | "top"; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed z-50 border border-border bg-surface shadow-lg outline-none data-[state=open]:animate-fade-up",
          side === "center" && "top-[12vh] left-1/2 w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 rounded-2xl",
          side === "top" && "top-3 left-1/2 w-[calc(100vw-1.5rem)] max-w-xl -translate-x-1/2 rounded-2xl sm:top-[10vh]",
          side === "right" && "inset-y-0 right-0 w-[min(88vw,360px)] rounded-l-2xl border-r-0",
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <D.Close className="absolute top-3 right-3 grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Close">
            <X className="size-4" />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}

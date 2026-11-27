"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Horizontal chip scroller with edge fades and arrow buttons on pointer devices. */
export function CategoryScroller({ children, activeIndex }: { children: React.ReactNode; activeIndex: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    const active = el.querySelectorAll("[data-chip]")[activeIndex] as HTMLElement | undefined;
    if (active && activeIndex > 0) el.scrollTo({ left: active.offsetLeft - el.clientWidth / 2 + active.clientWidth / 2 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [activeIndex]);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * Math.max(200, (ref.current?.clientWidth ?? 400) * 0.6), behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn("no-scrollbar flex gap-2 overflow-x-auto scroll-smooth py-3", !edges.start && !edges.end ? "fade-x" : !edges.start ? "[mask-image:linear-gradient(to_right,transparent,black_24px)]" : !edges.end ? "[mask-image:linear-gradient(to_left,transparent,black_24px)]" : "")}
      >
        {children}
      </div>
      {!edges.start && (
        <button type="button" aria-label="Scroll categories left" onClick={() => scroll(-1)} className="absolute top-1/2 left-0 hidden size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-md hover:text-foreground [@media(pointer:fine)]:grid">
          <ChevronLeft className="size-4" />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label="Scroll categories right" onClick={() => scroll(1)} className="absolute top-1/2 right-0 hidden size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-md hover:text-foreground [@media(pointer:fine)]:grid">
          <ChevronRight className="size-4" />
        </button>
      )}
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={cn("relative grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground", className)}
    >
      <Sun className={cn("size-[18px] transition-all duration-300", dark ? "scale-0 -rotate-90 opacity-0" : "scale-100 opacity-100")} />
      <Moon className={cn("absolute size-[18px] transition-all duration-300", dark ? "scale-100 opacity-100" : "scale-0 rotate-90 opacity-0")} />
    </button>
  );
}


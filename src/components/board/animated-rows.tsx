"use client";

import { Children, isValidElement, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "motion/react";

/**
 * Leaderboard list whose rows glide to their new positions when the ranking changes
 * (e.g. after a background refresh). Honours prefers-reduced-motion.
 */
export function AnimatedRows({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <ol className={className} aria-label={label}>
        {Children.map(children, (child, i) =>
          isValidElement(child) ? (
            <motion.li key={child.key ?? i} layout="position" transition={{ type: "spring", stiffness: 420, damping: 38 }} style={{ "--i": i } as React.CSSProperties} className="list-none">
              {child}
            </motion.li>
          ) : null,
        )}
      </ol>
    </MotionConfig>
  );
}

/** Quietly refreshes server data while the tab is visible, so boards stay live. */
export function LiveRefresh({ every = 30_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, every]);
  return null;
}

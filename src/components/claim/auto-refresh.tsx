"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches server data every few seconds (e.g. while waiting for a payment webhook). */
export function AutoRefresh({ every = 3000, max = 40 }: { every?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      if (n > max) clearInterval(t);
      else router.refresh();
    }, every);
    return () => clearInterval(t);
  }, [router, every, max]);
  return null;
}

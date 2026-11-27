"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { msUntilUtcMidnight } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");

function subscribeSecond(cb: () => void) {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
}
const nowSecond = () => Math.floor(Date.now() / 1000);

/** Live countdown to the next 00:00 UTC; refreshes the page data when the day rolls over. */
export function ResetCountdown({ className, compact }: { className?: string; compact?: boolean }) {
  const router = useRouter();
  const second = useSyncExternalStore(subscribeSecond, nowSecond, () => 0);
  const rolling = useRef(false);
  const ms = second === 0 ? null : msUntilUtcMidnight(new Date(second * 1000));

  useEffect(() => {
    if (ms !== null && ms <= 1000 && !rolling.current) {
      rolling.current = true;
      setTimeout(() => {
        rolling.current = false;
        router.refresh();
      }, 1500);
    }
  }, [ms, router]);

  if (ms === null) return <span className={className}>{compact ? "--:--:--" : "Resets at 00:00 UTC"}</span>;
  const total = Math.floor(ms / 1000);
  const text = `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  return (
    <span className={className} role="timer" aria-label={`Resets in ${text}`}>
      <span className="tabular">{text}</span>
    </span>
  );
}

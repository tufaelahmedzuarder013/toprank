"use client";

import { useState } from "react";
import { AtSign } from "lucide-react";
import { cn, hueFor, initials } from "@/lib/utils";

/** Listing icon with a graceful initials fallback when the remote image is missing or broken. */
export function ListingLogo({ src, name, kind, size = 40, className }: { src: string | null; name: string; kind?: "WEBSITE" | "X_PROFILE"; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const hue = hueFor(name);
  const radius = Math.round(size * 0.28);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party icons; next/image would need every host allow-listed
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("shrink-0 border border-border bg-surface object-cover", className)}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("relative grid shrink-0 place-items-center font-display font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: Math.round(size * 0.36),
        background: `linear-gradient(135deg, hsl(${hue} 72% 58%), hsl(${(hue + 40) % 360} 70% 46%))`,
      }}
    >
      {initials(name)}
      {kind === "X_PROFILE" && (
        <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-surface bg-foreground text-background">
          <AtSign className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

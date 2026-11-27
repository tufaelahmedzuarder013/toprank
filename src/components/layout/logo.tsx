import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id="tr-mark" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#tr-mark)" />
      <rect x="7" y="18" width="5" height="7" rx="1.6" fill="#fff" fillOpacity=".7" />
      <rect x="13.5" y="13" width="5" height="12" rx="1.6" fill="#fff" fillOpacity=".85" />
      <rect x="20" y="7" width="5" height="18" rx="1.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  return (
    <Link href="/" className={cn("group flex min-w-0 items-center gap-2.5 rounded-lg", className)} aria-label={`${name} home`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-provided logo URL
        <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-[9px] object-cover" />
      ) : (
        <LogoMark className="shrink-0 transition-transform duration-300 group-hover:-rotate-6" />
      )}
      <span className="truncate font-display text-[17px] font-extrabold tracking-tight">{name}</span>
    </Link>
  );
}

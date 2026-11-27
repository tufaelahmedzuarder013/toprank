import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const num = new Intl.NumberFormat("en-US");
const compactNum = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** $4,820 */
export const formatUsd = (n: number) => usd.format(n);
/** $4.8K above 10k, otherwise full */
export const formatUsdShort = (n: number) => (Math.abs(n) >= 10_000 ? compactUsd.format(n) : usd.format(n));
export const formatNumber = (n: number) => num.format(n);
export const formatCompact = (n: number) => (Math.abs(n) >= 10_000 ? compactNum.format(n) : num.format(n));

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function initials(name: string) {
  const clean = name.replace(/^@/, "").trim();
  const parts = clean.split(/[\s\-_.]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : clean.slice(0, 2);
  return letters.toUpperCase() || "?";
}

/** Deterministic hue for fallback avatars */
export function hueFor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

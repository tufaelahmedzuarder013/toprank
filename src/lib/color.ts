/** Small colour helpers so admin-chosen brand colours always meet WCAG AA contrast. */
type RGB = [number, number, number];

const parse = (hex: string): RGB => {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1] ?? "ff6a3d";
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};
const toHex = (c: RGB) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: RGB) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(parse(a)), luminance(parse(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function mix(a: string, b: string, weight: number) {
  const ca = parse(a);
  const cb = parse(b);
  return toHex(ca.map((v, i) => v * (1 - weight) + cb[i] * weight) as RGB);
}

/** Shift `hex` toward black/white until it reaches `min` contrast against `against`. */
export function ensureContrast(hex: string, against: string, min = 4.5) {
  const towards = luminance(parse(against)) > 0.4 ? "#000000" : "#ffffff";
  for (let w = 0; w <= 1; w += 0.02) {
    const c = mix(hex, towards, w);
    if (contrast(c, against) >= min) return c;
  }
  return towards;
}

const DARK_TEXT = "#160b07";

/**
 * Background + text colour for a solid button in the brand colour. Prefers white text on a
 * (slightly deepened) brand fill; if that would change the colour too much, keeps the
 * vivid fill and uses near-black text instead.
 */
export function solidPair(hex: string): { bg: string; fg: string } {
  for (let w = 0; w <= 0.12; w += 0.02) {
    const bg = mix(hex, "#000000", w);
    if (contrast(bg, "#ffffff") >= 4.5) return { bg, fg: "#ffffff" };
  }
  return { bg: hex, fg: contrast(hex, DARK_TEXT) >= 4.5 ? DARK_TEXT : "#ffffff" };
}

/**
 * CSS custom properties for the brand, injected on every page. Text "inks" get extra headroom
 * (5.4:1 / 6:1) so they stay above 4.5:1 on the tinted badge and button backgrounds too.
 */
export function brandCss(accent: string, secondary: string) {
  const a = solidPair(accent);
  const b = solidPair(secondary);
  const valid = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? h : "#ff6a3d");
  return `:root{--brand:${valid(accent)};--brand-2:${valid(secondary)};--brand-solid:${a.bg};--brand-fg:${a.fg};--brand-2-solid:${b.bg};--brand-2-fg:${b.fg};--brand-ink:${ensureContrast(accent, "#ffffff", 5.4)};--brand-2-ink:${ensureContrast(secondary, "#ffffff", 5.4)}}.dark{--brand-ink:${ensureContrast(accent, "#111116", 6)};--brand-2-ink:${ensureContrast(secondary, "#111116", 6.2)}}`;
}

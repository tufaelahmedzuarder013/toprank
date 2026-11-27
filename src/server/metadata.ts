import "server-only";
import { safeHttpUrl } from "@/lib/url";
import { safeFetchText } from "@/server/net";

export type SiteMetadata = {
  title: string | null;
  description: string | null;
  iconUrl: string | null;
  ogImageUrl: string | null;
  /** Why metadata couldn't be fetched (shown to the user as a hint) */
  error?: string;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function decodeEntities(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z#0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const safeChar = (code: number) => (code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : "");

function clean(s: string | null | undefined, max: number) {
  if (!s) return null;
  const v = decodeEntities(s).replace(/\s+/g, " ").trim();
  if (!v) return null;
  return v.length > max ? `${v.slice(0, max - 1).trimEnd()}…` : v;
}

function attr(tag: string, name: string) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
}

/** Extract title, description and images from an HTML document (no scripts executed). */
export function parseHtmlMetadata(html: string, pageUrl: string): Omit<SiteMetadata, "error"> {
  const head = html.slice(0, 300_000);
  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const meta = (key: string) => {
    for (const tag of metas) {
      const k = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
      if (k === key) return attr(tag, "content");
    }
    return null;
  };
  const title = clean(meta("og:title") ?? meta("twitter:title") ?? head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], 70);
  const description = clean(meta("description") ?? meta("og:description") ?? meta("twitter:description"), 200);

  const abs = (href: string | null) => {
    if (!href) return null;
    try {
      return safeHttpUrl(new URL(decodeEntities(href), pageUrl).toString());
    } catch {
      return null;
    }
  };

  let icon: string | null = null;
  let iconScore = -1;
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    if (!/\bicon\b|apple-touch-icon/.test(rel)) continue;
    const score = rel.includes("apple-touch-icon") ? 3 : /svg/.test(attr(tag, "type") ?? "") ? 2 : 1;
    const href = abs(attr(tag, "href"));
    if (href && score > iconScore) {
      icon = href;
      iconScore = score;
    }
  }
  if (!icon) icon = abs("/favicon.ico");

  return { title, description, iconUrl: icon, ogImageUrl: abs(meta("og:image") ?? meta("twitter:image")) };
}

/** Best-effort metadata for a public website. Never throws — returns nulls and an error hint instead. */
export async function fetchSiteMetadata(url: string): Promise<SiteMetadata> {
  try {
    const res = await safeFetchText(url);
    if (res.status >= 400) return { title: null, description: null, iconUrl: null, ogImageUrl: null, error: `The site responded with ${res.status}.` };
    if (!/html|xml|text\/plain/i.test(res.contentType)) return { title: null, description: null, iconUrl: null, ogImageUrl: null, error: "The link isn't an HTML page." };
    return parseHtmlMetadata(res.body, res.url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const blocked = /blocked|non-public/i.test(msg);
    return { title: null, description: null, iconUrl: null, ogImageUrl: null, error: blocked ? "That address isn't publicly reachable." : "We couldn't reach the site, so please fill in the details yourself." };
  }
}

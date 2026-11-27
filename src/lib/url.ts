/**
 * Parsing and normalisation (shared by the claim form and the server) of submitted links. The normalised `urlKey` is the
 * identity used to prevent duplicate listings.
 */
export type ParsedTarget =
  | { kind: "WEBSITE"; url: string; urlKey: string; domain: string; suggestedName: string }
  | { kind: "X_PROFILE"; url: string; urlKey: string; domain: string; handle: string; suggestedName: string };

export type ParseResult = { ok: true; value: ParsedTarget } | { ok: false; error: string };

const X_HOSTS = new Set(["x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com"]);
const X_RESERVED = new Set(["home", "explore", "i", "search", "settings", "intent", "share", "notifications", "messages", "login", "signup", "tos", "privacy", "hashtag", "compose"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".test", ".example", ".invalid", ".intranet", ".corp"];
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

function xProfile(handle: string): ParseResult {
  if (!HANDLE.test(handle) || X_RESERVED.has(handle.toLowerCase())) {
    return { ok: false, error: "That doesn't look like a valid X handle (1–15 letters, numbers or underscores)." };
  }
  return {
    ok: true,
    value: { kind: "X_PROFILE", url: `https://x.com/${handle}`, urlKey: `x:${handle.toLowerCase()}`, domain: `x.com/${handle}`, handle, suggestedName: `@${handle}` },
  };
}

function prettyName(host: string) {
  const base = host.split(".").slice(0, -1).join(".") || host;
  const label = base.split(".").pop() ?? base;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseTarget(raw: string): ParseResult {
  const input = (raw ?? "").trim();
  if (!input) return { ok: false, error: "Enter a website URL or an X handle." };
  if (input.length > 2048) return { ok: false, error: "That link is too long." };

  if (input.startsWith("@")) return xProfile(input.slice(1));

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "Only http:// and https:// links are allowed." };
  if (url.username || url.password) return { ok: false, error: "Links can't contain a username or password." };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, error: "Links must use the standard web ports." };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const bare = host.replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(bare) || bare.includes(":")) return { ok: false, error: "Please use a domain name rather than an IP address." };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return { ok: false, error: "That domain can't be listed." };
  const labels = host.split(".");
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || !/^(xn--[a-z0-9-]+|[a-z]{2,63})$/.test(tld) || labels.some((l) => !l || l.length > 63 || !/^[a-z0-9-]+$/.test(l) || l.startsWith("-") || l.endsWith("-"))) {
    return { ok: false, error: "Please enter a full domain, like example.com." };
  }

  const domain = host.replace(/^www\./, "");
  if (X_HOSTS.has(domain)) {
    const handle = url.pathname.split("/").filter(Boolean)[0];
    if (!handle) return { ok: false, error: "Add the profile handle, e.g. x.com/yourname." };
    return xProfile(handle);
  }

  const path = url.pathname.replace(/\/+$/, "");
  const urlKey = `${domain}${path.toLowerCase()}`;
  const cleanUrl = `${url.protocol}//${host}${path || "/"}${url.search}`;
  return { ok: true, value: { kind: "WEBSITE", url: cleanUrl, urlKey, domain: path ? `${domain}${path}` : domain, suggestedName: prettyName(domain) } };
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/@/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "listing";
}

/** Only http(s) URLs may be rendered as images or links coming from user/meta data. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

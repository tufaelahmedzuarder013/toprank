import { describe, expect, it } from "vitest";
import { addDays, dayWindow, msUntilUtcMidnight, nextUtcMidnight, parseDateKey, toDateKey, utcDayStart } from "@/lib/time";
import { parseTarget, slugify } from "@/lib/url";
import { isPublicAddress } from "@/server/net";
import { parseHtmlMetadata } from "@/server/metadata";

describe("UTC day boundaries (daily reset)", () => {
  it("uses UTC regardless of local time", () => {
    const lateEvening = new Date("2026-03-09T23:59:59.999Z");
    const justAfterMidnight = new Date("2026-03-10T00:00:00.000Z");
    expect(toDateKey(lateEvening)).toBe("2026-03-09");
    expect(toDateKey(justAfterMidnight)).toBe("2026-03-10");
    expect(utcDayStart(lateEvening).toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });
  it("counts down to the next UTC midnight", () => {
    const now = new Date("2026-03-09T22:30:00Z");
    expect(nextUtcMidnight(now).toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(msUntilUtcMidnight(now)).toBe(90 * 60_000);
    expect(msUntilUtcMidnight(new Date("2026-03-10T00:00:00Z"))).toBe(86_400_000);
  });
  it("builds half-open day windows", () => {
    const w = dayWindow("2026-02-28")!;
    expect(w.start.toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("rejects invalid date keys", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "26-01-01", "2026-1-1", "nope"]) expect(parseDateKey(bad)).toBeNull();
  });
});

describe("link parsing", () => {
  it("normalises websites so duplicates collide", () => {
    const keys = ["https://www.Example.com/", "example.com", "http://example.com", "EXAMPLE.com/?ref=x#top"].map((v) => {
      const r = parseTarget(v);
      return r.ok ? r.value.urlKey : r.error;
    });
    expect(new Set(keys)).toEqual(new Set(["example.com"]));
  });
  it("keeps paths as part of the identity", () => {
    const r = parseTarget("github.com/acme/widget/");
    expect(r.ok && r.value).toMatchObject({ kind: "WEBSITE", urlKey: "github.com/acme/widget", domain: "github.com/acme/widget" });
  });
  it("recognises X handles in several forms", () => {
    for (const v of ["@BuildInPublic", "x.com/BuildInPublic", "https://twitter.com/buildinpublic/", "https://www.x.com/BuildInPublic?s=20"]) {
      const r = parseTarget(v);
      expect(r.ok && r.value).toMatchObject({ kind: "X_PROFILE", urlKey: "x:buildinpublic" });
    }
    expect(parseTarget("@this_handle_is_too_long").ok).toBe(false);
    expect(parseTarget("x.com/home").ok).toBe(false);
  });
  it("rejects unsafe or invalid links", () => {
    for (const v of ["", "ftp://example.com", "javascript:alert(1)", "http://127.0.0.1", "http://[::1]/", "http://localhost:3000", "https://user:pass@example.com", "https://example.com:8080", "intranet.local", "notadomain", "http://0x7f.0.0.1"]) {
      expect(parseTarget(v).ok, v).toBe(false);
    }
  });
  it("creates URL-safe slugs", () => {
    expect(slugify("Crème Brûlée App!")).toBe("creme-brulee-app");
    expect(slugify("@handle_name")).toBe("handle-name");
  });
});

describe("SSRF protection", () => {
  it("only allows public unicast addresses", () => {
    for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"]) expect(isPublicAddress(ip), ip).toBe(true);
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "not-an-ip"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });
});

describe("metadata parsing", () => {
  it("extracts title, description and icons, resolving relative URLs", () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Acme &amp; Co — Widgets">
      <meta name="description" content="Widgets for   everyone.">
      <link rel="icon" href="/favicon.png"><link rel="apple-touch-icon" href="/touch.png">
      <meta property="og:image" content="https://cdn.example.org/og.png">
      <link rel="icon" href="javascript:alert(1)"></head></html>`;
    expect(parseHtmlMetadata(html, "https://acme.test/products")).toEqual({
      title: "Acme & Co — Widgets",
      description: "Widgets for everyone.",
      iconUrl: "https://acme.test/touch.png",
      ogImageUrl: "https://cdn.example.org/og.png",
    });
  });
  it("falls back to /favicon.ico and nulls", () => {
    expect(parseHtmlMetadata("<p>hi</p>", "https://x.test/")).toEqual({ title: null, description: null, iconUrl: "https://x.test/favicon.ico", ogImageUrl: null });
  });
});

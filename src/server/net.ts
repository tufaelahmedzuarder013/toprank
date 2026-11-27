import "server-only";
import dns from "node:dns";
import ipaddr from "ipaddr.js";
import { Agent, fetch } from "undici";
import { parseTarget } from "@/lib/url";

/** True only for globally routable unicast addresses (blocks private, loopback, link-local, CGNAT, multicast, reserved…). */
export function isPublicAddress(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  let addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) addr = (addr as ipaddr.IPv6).toIPv4Address();
  return addr.range() === "unicast";
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address?: string | dns.LookupAddress[], family?: number) => void;

/**
 * DNS lookup used for every outbound connection: resolves the name and refuses
 * to connect if any resolved address is non-public. Because the check happens at
 * connect time, DNS-rebinding tricks can't swap in an internal address later.
 */
function guardedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback) {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => !isPublicAddress(a.address))) {
      const e = new Error(`Blocked request to non-public address for ${hostname}`) as NodeJS.ErrnoException;
      e.code = "EBLOCKED";
      return callback(e);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({
  connect: { lookup: guardedLookup as never, timeout: 5_000 },
  headersTimeout: 6_000,
  bodyTimeout: 6_000,
});

const MAX_BYTES = 1_000_000;

export type SafeResponse = { url: string; status: number; contentType: string; body: string };

/**
 * Fetch a public web page safely: http(s) only, standard ports, no internal
 * addresses, manual redirects (each hop re-validated), a short timeout and a size cap.
 */
export async function safeFetchText(rawUrl: string, { maxRedirects = 3, timeoutMs = 7_000 } = {}): Promise<SafeResponse> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const parsed = parseTarget(current);
    if (!parsed.ok) throw new Error(parsed.error);
    const res = await fetch(current, {
      dispatcher: agent,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "ToprungBot/1.0 (+metadata preview)", accept: "text/html,application/xhtml+xml,text/plain;q=0.8" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new Error("Redirect without a location");
      current = new URL(location, current).toString();
      continue;
    }
    const contentType = res.headers.get("content-type") ?? "";
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        chunks.push(value);
        if (received >= MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    const body = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    return { url: current, status: res.status, contentType, body };
  }
  throw new Error("Too many redirects");
}

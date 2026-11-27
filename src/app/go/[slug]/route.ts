import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";

/**
 * Outbound click tracking: counts a visit (at most once per visitor per listing every
 * 30 minutes) and redirects to the listing's URL. Only active listings redirect.
 */
export async function GET(req: Request, ctx: RouteContext<"/go/[slug]">) {
  const { slug } = await ctx.params;
  const listing = await db.listing.findUnique({ where: { slug }, select: { id: true, url: true, status: true } });
  if (!listing || listing.status !== "ACTIVE") return NextResponse.redirect(new URL("/", req.url), 302);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const isBot = /bot|crawl|spider|preview|slurp|facebookexternalhit/i.test(req.headers.get("user-agent") ?? "");
  if (!isBot && rateLimit(`click:${ip}:${listing.id}`, 1, 30 * 60_000).ok) {
    await db.listing.update({ where: { id: listing.id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  }
  const res = NextResponse.redirect(listing.url, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "origin");
  return res;
}

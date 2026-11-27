import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { freezeDay } from "@/server/leaderboard";
import { addDays, toDateKey } from "@/lib/time";
import { closePayment } from "@/server/payments";
import { expireCheckoutSession } from "@/server/payment-provider";

/**
 * Daily maintenance. Call shortly after 00:00 UTC (e.g. Vercel Cron, GitHub Actions or crontab):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/daily-snapshot
 * - freezes the final ranking of the last 7 finished UTC days into the archive (idempotent)
 * - expires pending checkouts older than 2 hours so their links are released
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = toDateKey(new Date());
  const frozen: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const day = addDays(today, -i);
    const exists = await db.dailySnapshot.findUnique({ where: { date: day }, select: { date: true } });
    if (!exists) {
      await freezeDay(day);
      frozen.push(day);
    }
  }

  const stale = await db.payment.findMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 2 * 3_600_000) } }, select: { id: true, providerSessionId: true }, take: 200 });
  let expired = 0;
  for (const p of stale) {
    const state = p.providerSessionId ? await expireCheckoutSession(p.providerSessionId) : "expired";
    if (state !== "expired") continue; // submitted (delayed payment method) or Stripe unreachable — leave it to the webhook
    await closePayment({ paymentId: p.id, status: "EXPIRED", reason: "Checkout was never completed." });
    expired++;
  }

  return NextResponse.json({ ok: true, frozen, expired });
}

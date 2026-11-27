import "server-only";
import { promises as dns } from "node:dns";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { safeFetchText } from "@/server/net";
import { paymentMode } from "@/server/payment-provider";
import type { VerificationMethod } from "@/generated/prisma/client";

import { VERIFY_FILE, VERIFY_KEY } from "@/lib/verification";

export { VERIFY_FILE, VERIFY_KEY };

export async function getOrCreateOwnershipClaim(listingId: string, userId: string) {
  const existing = await db.ownershipClaim.findUnique({ where: { listingId_userId: { listingId, userId } } });
  if (existing) return existing;
  return db.ownershipClaim.create({ data: { listingId, userId, token: randomBytes(18).toString("base64url") } });
}

function rootHost(domain: string) {
  return domain.split("/")[0];
}

async function checkDns(host: string, token: string) {
  const expected = `${VERIFY_KEY}=${token}`;
  for (const name of [host, `_toprung.${host}`]) {
    try {
      const records = await dns.resolveTxt(name);
      if (records.some((parts) => parts.join("").trim() === expected)) return true;
    } catch {
      // NXDOMAIN / no TXT — try the next name
    }
  }
  return false;
}

async function checkMeta(url: string, token: string) {
  const res = await safeFetchText(new URL("/", url).toString());
  const tags = res.body.slice(0, 300_000).match(/<meta\b[^>]*>/gi) ?? [];
  return tags.some((t) => new RegExp(`name\\s*=\\s*["']?${VERIFY_KEY}["']?`, "i").test(t) && new RegExp(`content\\s*=\\s*["']?${token}["']?`).test(t));
}

async function checkFile(url: string, token: string) {
  const res = await safeFetchText(new URL(VERIFY_FILE, url).toString());
  return res.status === 200 && res.body.trim().split(/\s+/).includes(token);
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/**
 * Proves control of a listing's domain. On success the user becomes the
 * listing's verified owner (replacing any previous owner — domain control wins).
 */
export async function verifyOwnership(params: { listingId: string; userId: string; method: VerificationMethod }): Promise<VerifyResult> {
  const listing = await db.listing.findUnique({ where: { id: params.listingId } });
  if (!listing || listing.status === "REMOVED" || listing.status === "PENDING") return { ok: false, error: "Listing not found." };
  const claim = await getOrCreateOwnershipClaim(listing.id, params.userId);
  if (claim.verifiedAt && listing.ownerId === params.userId) return { ok: true };

  let passed = false;
  try {
    switch (params.method) {
      case "DNS":
        if (listing.kind !== "WEBSITE") return { ok: false, error: "DNS verification is only available for websites." };
        passed = await checkDns(rootHost(listing.domain), claim.token);
        break;
      case "META":
        if (listing.kind !== "WEBSITE") return { ok: false, error: "Meta tag verification is only available for websites." };
        passed = await checkMeta(listing.url, claim.token);
        break;
      case "FILE":
        if (listing.kind !== "WEBSITE") return { ok: false, error: "File verification is only available for websites." };
        passed = await checkFile(listing.url, claim.token);
        break;
      case "DEMO":
        if (paymentMode() !== "demo") return { ok: false, error: "Instant verification is only available in demo mode." };
        passed = true;
        break;
      default:
        return { ok: false, error: "Unsupported verification method." };
    }
  } catch {
    return { ok: false, error: "We couldn't reach your site to check. Make sure it's publicly accessible and try again." };
  }
  if (!passed) return { ok: false, error: "We couldn't find your verification code yet. DNS changes can take a few minutes to appear." };

  await markVerified(claim.id, params.method);
  return { ok: true };
}

export async function markVerified(claimId: string, method: VerificationMethod) {
  const now = new Date();
  await db.$transaction(async (tx) => {
    const claim = await tx.ownershipClaim.update({ where: { id: claimId }, data: { verifiedAt: now, method } });
    await tx.listing.update({ where: { id: claim.listingId }, data: { ownerId: claim.userId, verifiedAt: now } });
  });
}

"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { fieldErrors, str } from "@/server/forms";
import { getOrCreateOwnershipClaim, verifyOwnership } from "@/server/ownership";
import { rateLimit } from "@/server/rate-limit";
import { safeHttpUrl } from "@/lib/url";
import type { FormState } from "./types";

const methods = ["DNS", "META", "FILE", "DEMO"] as const;

export async function verifyOwnershipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const listingId = str(formData, "listingId");
  const user = await requireUser(`/dashboard/listings/${listingId}`);
  const method = str(formData, "method") as (typeof methods)[number];
  if (!methods.includes(method)) return { error: "Choose a verification method." };
  if (!rateLimit(`verify:${user.id}`, 15, 10 * 60_000).ok) return { error: "Too many attempts — wait a few minutes before checking again." };
  const result = await verifyOwnership({ listingId, userId: user.id, method });
  if (!result.ok) return { error: result.error };
  refresh();
  return { ok: true, message: "Ownership verified. You can now edit and upgrade this listing." };
}

/** For X profiles (or sites where the automatic checks can't work): ask an admin to review. */
export async function requestManualReviewAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const listingId = str(formData, "listingId");
  const user = await requireUser(`/dashboard/listings/${listingId}`);
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { status: true } });
  if (!listing || (listing.status !== "ACTIVE" && listing.status !== "HIDDEN")) return { error: "Listing not found." };
  const claim = await getOrCreateOwnershipClaim(listingId, user.id);
  if (claim.verifiedAt) return { ok: true, message: "You're already verified." };
  await db.ownershipClaim.update({ where: { id: claim.id }, data: { method: "MANUAL" } });
  refresh();
  return { ok: true, message: "Thanks — an admin will review your request. Keep the code in your bio until then." };
}

const editSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(60),
  description: z.string().trim().max(200),
  logoUrl: z.string().trim().max(1000),
  categoryId: z.string().min(1),
});

/** Verified owners can keep their listing's details up to date. */
export async function updateOwnListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const listingId = str(formData, "listingId");
  const user = await requireUser(`/dashboard/listings/${listingId}`);
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { ownerId: true, verifiedAt: true, status: true } });
  if (!listing || listing.ownerId !== user.id || !listing.verifiedAt) return { error: "Only the verified owner can edit this listing." };
  if (listing.status === "REMOVED") return { error: "This listing was removed by a moderator." };
  const parsed = editSchema.safeParse({ name: str(formData, "name"), description: str(formData, "description"), logoUrl: str(formData, "logoUrl"), categoryId: str(formData, "categoryId") });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const category = await db.category.findFirst({ where: { id: parsed.data.categoryId, enabled: true }, select: { id: true } });
  if (!category) return { error: "Choose a valid category.", fieldErrors: { categoryId: "Choose a valid category." } };
  if (parsed.data.logoUrl && !safeHttpUrl(parsed.data.logoUrl)) return { error: "The logo must be an http(s) image URL.", fieldErrors: { logoUrl: "Use an http(s) URL." } };
  await db.listing.update({ where: { id: listingId }, data: { name: parsed.data.name, description: parsed.data.description, logoUrl: safeHttpUrl(parsed.data.logoUrl), categoryId: category.id } });
  refresh();
  return { ok: true, message: "Listing updated." };
}

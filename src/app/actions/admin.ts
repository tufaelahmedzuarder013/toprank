"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { fieldErrors, str } from "@/server/forms";
import { markVerified } from "@/server/ownership";
import { settleRefund } from "@/server/payments";
import { getSettings, saveSettings, settingsSchema } from "@/server/settings";
import { defaultContentPages, type SiteSettingsData } from "@/config/defaults";
import { CATEGORY_ICON_KEYS } from "@/config/icons";
import { safeHttpUrl, slugify } from "@/lib/url";
import type { FormState } from "./types";

// ── Listings ─────────────────────────────────────────────────────────────────

export async function setListingStatusAction(listingId: string, status: "ACTIVE" | "HIDDEN" | "REMOVED") {
  await requireAdmin();
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { status: true } });
  if (!listing || listing.status === "PENDING") return;
  await db.listing.update({ where: { id: listingId }, data: { status } });
  refresh();
}

const adminEditSchema = z.object({
  name: z.string().trim().min(1, "Required").max(60),
  description: z.string().trim().max(200),
  logoUrl: z.string().trim().max(1000),
  categoryId: z.string().min(1),
});

export async function adminUpdateListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "listingId");
  const parsed = adminEditSchema.safeParse({ name: str(formData, "name"), description: str(formData, "description"), logoUrl: str(formData, "logoUrl"), categoryId: str(formData, "categoryId") });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.logoUrl && !safeHttpUrl(parsed.data.logoUrl)) return { fieldErrors: { logoUrl: "Use an http(s) URL." }, error: "Invalid logo URL." };
  await db.listing.update({ where: { id }, data: { ...parsed.data, logoUrl: safeHttpUrl(parsed.data.logoUrl) } });
  refresh();
  return { ok: true, message: "Listing saved." };
}

// ── Ownership reviews ────────────────────────────────────────────────────────

export async function approveOwnershipAction(claimId: string) {
  await requireAdmin();
  const claim = await db.ownershipClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.verifiedAt) return;
  await markVerified(claim.id, "MANUAL");
  refresh();
}

export async function rejectOwnershipAction(claimId: string) {
  await requireAdmin();
  await db.ownershipClaim.updateMany({ where: { id: claimId, verifiedAt: null }, data: { method: null } });
  refresh();
}

export async function revokeOwnershipAction(listingId: string) {
  await requireAdmin();
  await db.$transaction([
    db.listing.update({ where: { id: listingId }, data: { ownerId: null, verifiedAt: null } }),
    db.ownershipClaim.updateMany({ where: { listingId }, data: { verifiedAt: null, method: null } }),
  ]);
  refresh();
}

// ── Payments ─────────────────────────────────────────────────────────────────

export async function retryRefundAction(paymentId: string) {
  await requireAdmin();
  await settleRefund(paymentId);
  refresh();
}

export async function markRefundedAction(paymentId: string) {
  await requireAdmin();
  const p = await db.payment.findUnique({ where: { id: paymentId }, select: { status: true, failureReason: true } });
  if (!p || p.status !== "FAILED" || !p.failureReason?.startsWith("REFUND_REQUIRED")) return;
  await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", failureReason: `${p.failureReason.replace(/^REFUND_REQUIRED:\s*/, "")} (refunded manually by an admin)` } });
  refresh();
}

// ── Categories ───────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(1, "Required").max(40),
  slug: z.string().trim().max(48),
  icon: z.enum(CATEGORY_ICON_KEYS),
  description: z.string().trim().max(200),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const parsed = categorySchema.safeParse({ name: str(formData, "name"), slug: str(formData, "slug"), icon: str(formData, "icon"), description: str(formData, "description"), sortOrder: str(formData, "sortOrder") || "0" });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const slug = slugify(parsed.data.slug || parsed.data.name);
  const clash = await db.category.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) return { error: "Another category already uses this slug.", fieldErrors: { slug: "Already in use" } };
  const data = { ...parsed.data, slug };
  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  refresh();
  return { ok: true, message: id ? "Category saved." : "Category created." };
}

export async function toggleCategoryAction(id: string, enabled: boolean) {
  await requireAdmin();
  await db.category.update({ where: { id }, data: { enabled } });
  refresh();
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  await requireAdmin();
  const used = await db.listing.count({ where: { categoryId: id } });
  if (used) return { error: `This category has ${used} listing${used === 1 ? "" : "s"}. Disable it or move them first.` };
  await db.category.delete({ where: { id } });
  refresh();
  return { ok: true };
}

// ── Site settings ────────────────────────────────────────────────────────────

const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const current = await getSettings();
  const section = str(formData, "section");
  const next: SiteSettingsData = structuredClone(current);

  switch (section) {
    case "brand":
      next.brand = { name: str(formData, "name"), tagline: str(formData, "tagline"), description: str(formData, "description"), logoUrl: str(formData, "logoUrl") || null, accent: str(formData, "accent"), secondary: str(formData, "secondary") };
      next.contactEmail = str(formData, "contactEmail");
      break;
    case "home":
      next.home = { heading: str(formData, "heading"), subheading: str(formData, "subheading"), rulesNote: str(formData, "rulesNote"), ctaHeading: str(formData, "ctaHeading"), ctaText: str(formData, "ctaText") };
      next.disclosure = str(formData, "disclosure");
      break;
    case "rules":
      next.rules = {
        minAmount: Number(str(formData, "minAmount")),
        topIncrement: Number(str(formData, "topIncrement")),
        overtakeIncrement: Number(str(formData, "overtakeIncrement")),
        maxTotal: Number(str(formData, "maxTotal")),
      };
      break;
    case "featured":
      next.featured = {
        enabled: bool(formData, "enabled"),
        title: str(formData, "title"),
        description: str(formData, "description"),
        listingSlugs: str(formData, "listingSlugs").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
      };
      next.seasonal = {
        enabled: bool(formData, "seasonalEnabled"),
        badge: str(formData, "seasonalBadge"),
        title: str(formData, "seasonalTitle"),
        description: str(formData, "seasonalDescription"),
        href: str(formData, "seasonalHref") || "/",
      };
      break;
    default:
      return { error: "Unknown settings section." };
  }

  const parsed = settingsSchema.safeParse(next);
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error);
    // Strip the section prefix so inputs can show their own error.
    const flat = Object.fromEntries(Object.entries(errs).map(([k, v]) => [k.split(".").pop()!, v]));
    return { error: "Please fix the highlighted fields.", fieldErrors: flat };
  }
  await saveSettings(parsed.data as SiteSettingsData);
  refresh();
  return { ok: true, message: "Settings saved." };
}

// ── Content pages & FAQ ──────────────────────────────────────────────────────

const pageSchema = z.object({ title: z.string().trim().min(1, "Required").max(120), body: z.string().trim().min(1, "Required").max(30_000) });

export async function saveContentPageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const slug = str(formData, "slug");
  if (!defaultContentPages.some((p) => p.slug === slug)) return { error: "Unknown page." };
  const parsed = pageSchema.safeParse({ title: str(formData, "title"), body: str(formData, "body") });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  await db.contentPage.upsert({ where: { slug }, create: { slug, ...parsed.data }, update: parsed.data });
  refresh();
  return { ok: true, message: "Page saved." };
}

export async function resetContentPageAction(slug: string) {
  await requireAdmin();
  await db.contentPage.deleteMany({ where: { slug } });
  refresh();
}

const faqSchema = z.object({ question: z.string().trim().min(3, "Required").max(200), answer: z.string().trim().min(3, "Required").max(3000), sortOrder: z.coerce.number().int().min(0).max(999) });

export async function saveFaqAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(formData, "id");
  const parsed = faqSchema.safeParse({ question: str(formData, "question"), answer: str(formData, "answer"), sortOrder: str(formData, "sortOrder") || "0" });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const published = formData.get("published") === "on";
  if (id) await db.faq.update({ where: { id }, data: { ...parsed.data, published } });
  else await db.faq.create({ data: { ...parsed.data, published } });
  refresh();
  return { ok: true, message: id ? "Question saved." : "Question added." };
}

export async function deleteFaqAction(id: string) {
  await requireAdmin();
  await db.faq.deleteMany({ where: { id } });
  refresh();
}

// ── Messages, users, demo data ───────────────────────────────────────────────

export async function setMessageHandledAction(id: string, handled: boolean) {
  await requireAdmin();
  await db.contactMessage.update({ where: { id }, data: { handled } });
  refresh();
}

export async function deleteMessageAction(id: string) {
  await requireAdmin();
  await db.contactMessage.deleteMany({ where: { id } });
  refresh();
}

export async function setUserRoleAction(userId: string, role: "USER" | "ADMIN") {
  const admin = await requireAdmin();
  if (admin.id === userId) return; // never demote yourself by accident
  await db.user.update({ where: { id: userId }, data: { role } });
  refresh();
}

/**
 * Removes seeded sample listings and anything bought through the simulated (demo) checkout:
 * listings whose only payments are demo payments, plus demo payments on real listings.
 */
export async function removeDemoDataAction(): Promise<FormState> {
  await requireAdmin();
  const where = { OR: [{ isDemo: true }, { AND: [{ payments: { some: {} } }, { payments: { every: { isDemo: true } } }] }] };
  const listings = await db.listing.deleteMany({ where });
  const payments = await db.payment.deleteMany({ where: { isDemo: true } });
  await db.dailySnapshot.deleteMany({});
  refresh();
  return { ok: true, message: `Removed ${listings.count} demo listings and their simulated payments (plus ${payments.count} other demo payments).` };
}

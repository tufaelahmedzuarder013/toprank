"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { parseTarget } from "@/lib/url";
import { getCurrentUser, requireUser } from "@/server/auth";
import { claimDetailsSchema, lookupExisting, startNewListingCheckout, startUpgradeCheckout } from "@/server/claims";
import { rememberCheckout } from "@/server/checkout-cookie";
import { fieldErrors, str } from "@/server/forms";
import { fetchSiteMetadata } from "@/server/metadata";
import { clientIp, rateLimit } from "@/server/rate-limit";
import type { FormState } from "./types";

export type TargetPreview =
  | { ok: false; error: string }
  | {
      ok: true;
      kind: "WEBSITE" | "X_PROFILE";
      url: string;
      domain: string;
      name: string;
      description: string;
      logoUrl: string | null;
      ogImageUrl: string | null;
      fetched: boolean;
      hint: string | null;
      existing: { state: "free" } | { state: "listed"; slug: string; name: string; hidden: boolean } | { state: "blocked" } | { state: "reserved"; until: string };
    };

/** Validates a link, checks whether it's already listed and fetches its public metadata (SSRF-safe). */
export async function previewTargetAction(target: string): Promise<TargetPreview> {
  const limit = rateLimit(`meta:${await clientIp()}`, 30, 10 * 60_000);
  if (!limit.ok) return { ok: false, error: "Too many lookups — please wait a minute and try again." };
  const parsed = parseTarget(String(target ?? "").slice(0, 2048));
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const t = parsed.value;
  const found = await lookupExisting(t.urlKey);
  const existing = found.state === "reserved" ? { state: "reserved" as const, until: found.until.toISOString() } : found;

  if (t.kind === "X_PROFILE") {
    return { ok: true, kind: t.kind, url: t.url, domain: t.domain, name: t.suggestedName, description: "", logoUrl: null, ogImageUrl: null, fetched: false, hint: "We don't scrape X — add a short description and, if you like, a public image URL for your avatar.", existing };
  }
  if (found.state !== "free") {
    return { ok: true, kind: t.kind, url: t.url, domain: t.domain, name: t.suggestedName, description: "", logoUrl: null, ogImageUrl: null, fetched: false, hint: null, existing };
  }
  const meta = await fetchSiteMetadata(t.url);
  return {
    ok: true,
    kind: t.kind,
    url: t.url,
    domain: t.domain,
    name: meta.title ?? t.suggestedName,
    description: meta.description ?? "",
    logoUrl: meta.iconUrl,
    ogImageUrl: meta.ogImageUrl,
    fetched: !meta.error,
    hint: meta.error ? "We couldn't read this site's details automatically — fill them in below." : null,
    existing,
  };
}

/** Creates the pending claim and sends the visitor to the hosted checkout. */
export async function startClaimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const limit = rateLimit(`claim:${await clientIp()}`, 12, 10 * 60_000);
  if (!limit.ok) return { error: "Too many checkout attempts. Please wait a few minutes and try again." };

  const parsed = claimDetailsSchema.safeParse({
    target: str(formData, "target"),
    category: str(formData, "category"),
    amount: str(formData, "amount"),
    name: str(formData, "name"),
    description: str(formData, "description"),
    logoUrl: str(formData, "logoUrl") || null,
    ogImageUrl: str(formData, "ogImageUrl") || null,
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (formData.get("terms") !== "on") return { error: "Please accept the terms to continue.", fieldErrors: { terms: "Required" } };

  const user = await getCurrentUser();
  const result = await startNewListingCheckout({ ...parsed.data, userId: user?.id ?? null, userEmail: user?.email ?? null });
  if (!result.ok) {
    const field = result.code === "INVALID_AMOUNT" ? "amount" : result.code === "INVALID_CATEGORY" ? "category" : result.code === "PROVIDER_ERROR" ? undefined : "target";
    return {
      error: result.error,
      fieldErrors: field ? { [field]: result.error } : undefined,
      data: { code: result.code, slug: result.slug, issues: result.issues },
    };
  }
  await rememberCheckout(result.paymentId);
  redirect(result.url);
}

const upgradeSchema = z.object({ listingId: z.string().min(1), newTotal: z.coerce.number().int("Use whole dollars only.") });

/** Owner-only: raise a listing's total, paying only the difference. */
export async function startUpgradeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const listingId = str(formData, "listingId");
  const user = await requireUser(`/dashboard/listings/${listingId}`);
  const limit = rateLimit(`upgrade:${user.id}`, 12, 10 * 60_000);
  if (!limit.ok) return { error: "Too many checkout attempts. Please wait a few minutes." };
  const parsed = upgradeSchema.safeParse({ listingId, newTotal: str(formData, "newTotal") });
  if (!parsed.success) return { error: "Enter a whole-dollar total.", fieldErrors: fieldErrors(parsed.error) };
  const result = await startUpgradeCheckout({ listingId, userId: user.id, userEmail: user.email, newTotal: parsed.data.newTotal });
  if (!result.ok) return { error: result.error, fieldErrors: result.code === "INVALID_AMOUNT" ? { newTotal: result.error } : undefined, data: { issues: result.issues } };
  await rememberCheckout(result.paymentId);
  redirect(result.url);
}

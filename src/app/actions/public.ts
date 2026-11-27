"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { fieldErrors, str } from "@/server/forms";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { searchListings } from "@/server/leaderboard";
import type { FormState } from "./types";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email address.").max(160),
  topic: z.enum(["general", "listing", "payment", "removal", "partnership", "other"]),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters).").max(4000),
});

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (str(formData, "website")) return { ok: true, message: "Thanks! We'll get back to you soon." }; // honeypot
  if (!rateLimit(`contact:${await clientIp()}`, 5, 60 * 60_000).ok) return { error: "You've sent several messages already — please try again later." };
  const parsed = contactSchema.safeParse({ name: str(formData, "name"), email: str(formData, "email"), topic: str(formData, "topic") || "general", message: str(formData, "message") });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  await db.contactMessage.create({ data: parsed.data });
  return { ok: true, message: "Thanks! Your message is in — we usually reply within two working days." };
}

export type QuickResult = { slug: string; name: string; domain: string; logoUrl: string | null; kind: "WEBSITE" | "X_PROFILE"; rank: number; amount: number; category: string };

export async function quickSearchAction(q: string): Promise<QuickResult[]> {
  const term = String(q ?? "").trim();
  if (term.length < 2) return [];
  if (!rateLimit(`qs:${await clientIp()}`, 90, 60_000).ok) return [];
  const items = await searchListings({ q: term, limit: 6 });
  return items.map((i) => ({ slug: i.slug, name: i.name, domain: i.domain, logoUrl: i.logoUrl, kind: i.kind, rank: i.rank, amount: i.amount, category: i.category.name }));
}

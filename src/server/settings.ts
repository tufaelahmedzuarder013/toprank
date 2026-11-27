import "server-only";
import { cache } from "react";
import { z } from "zod";
import { defaultContentPages, defaultSettings, type SiteSettingsData } from "@/config/defaults";
import { db } from "@/server/db";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #FF6A3D");
const text = (max: number) => z.string().trim().max(max);

export const settingsSchema = z.object({
  brand: z.object({
    name: text(40).min(1),
    tagline: text(120),
    description: text(300),
    logoUrl: z.union([z.string().trim().url().max(500).regex(/^https?:\/\//, "Logo must be an http(s) URL"), z.literal(""), z.null()]).transform((v) => v || null),
    accent: hex,
    secondary: hex,
  }),
  home: z.object({
    heading: text(80).min(1),
    subheading: text(240),
    rulesNote: text(240),
    ctaHeading: text(100),
    ctaText: text(240),
  }),
  rules: z
    .object({
      minAmount: z.coerce.number().int().min(1).max(1_000_000),
      topIncrement: z.coerce.number().int().min(1).max(1_000_000),
      overtakeIncrement: z.coerce.number().int().min(1).max(1_000_000),
      maxTotal: z.coerce.number().int().min(1).max(100_000_000),
    })
    .refine((r) => r.maxTotal >= r.minAmount, { message: "Maximum must be at least the minimum", path: ["maxTotal"] }),
  disclosure: text(400).min(1),
  featured: z.object({
    enabled: z.boolean(),
    title: text(60),
    description: text(240),
    listingSlugs: z.array(z.string().trim().min(1).max(80)).max(6),
  }),
  seasonal: z.object({
    enabled: z.boolean(),
    badge: text(24),
    title: text(60),
    description: text(240),
    href: z.string().trim().max(200).regex(/^\//, "Use an internal path like /today"),
  }),
  contactEmail: z.string().trim().email().max(120),
});

function merge(stored: unknown): SiteSettingsData {
  const s = (stored ?? {}) as Partial<SiteSettingsData>;
  const merged: SiteSettingsData = {
    brand: { ...defaultSettings.brand, ...s.brand },
    home: { ...defaultSettings.home, ...s.home },
    rules: { ...defaultSettings.rules, ...s.rules },
    disclosure: s.disclosure ?? defaultSettings.disclosure,
    featured: { ...defaultSettings.featured, ...s.featured },
    seasonal: { ...defaultSettings.seasonal, ...s.seasonal },
    contactEmail: s.contactEmail ?? defaultSettings.contactEmail,
  };
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as SiteSettingsData) : defaultSettings;
}

/** Site settings for this request (defaults merged with whatever the admin saved). */
export const getSettings = cache(async (): Promise<SiteSettingsData> => {
  const row = await db.siteSettings.findUnique({ where: { id: 1 } });
  return merge(row?.data);
});

export async function saveSettings(data: SiteSettingsData) {
  const valid = settingsSchema.parse(data);
  await db.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, data: valid }, update: { data: valid } });
}

/** Replace {{placeholders}} in editable copy with live settings. */
export function fillPlaceholders(text: string, s: SiteSettingsData) {
  const values: Record<string, string> = {
    siteName: s.brand.name,
    minAmount: s.rules.minAmount.toLocaleString("en-US"),
    topIncrement: s.rules.topIncrement.toLocaleString("en-US"),
    overtakeIncrement: s.rules.overtakeIncrement.toLocaleString("en-US"),
    maxTotal: s.rules.maxTotal.toLocaleString("en-US"),
    contactEmail: s.contactEmail,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (m, key: string) => values[key] ?? m);
}

export const getContentPage = cache(async (slug: string) => {
  const row = await db.contentPage.findUnique({ where: { slug } });
  const fallback = defaultContentPages.find((p) => p.slug === slug);
  const page = row ?? fallback;
  if (!page) return null;
  const s = await getSettings();
  return { slug, title: fillPlaceholders(page.title, s), body: fillPlaceholders(page.body, s), updatedAt: row?.updatedAt ?? null };
});

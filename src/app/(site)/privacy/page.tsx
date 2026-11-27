import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/settings";
import { MarkdownPage } from "@/components/info/info-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("privacy");
  return { title: page?.title, description: page?.body.replace(/[#*`>\[\]()\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: "/privacy" } };
}

export default async function PrivacyPage() {
  const page = await getContentPage("privacy");
  if (!page) notFound();
  return <MarkdownPage eyebrow="Legal" active="/privacy" page={page} cta={false} />;
}

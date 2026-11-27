import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/settings";
import { MarkdownPage } from "@/components/info/info-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("terms");
  return { title: page?.title, description: page?.body.replace(/[#*`>\[\]()\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: "/terms" } };
}

export default async function TermsPage() {
  const page = await getContentPage("terms");
  if (!page) notFound();
  return <MarkdownPage eyebrow="Legal" active="/terms" page={page} cta={false} />;
}

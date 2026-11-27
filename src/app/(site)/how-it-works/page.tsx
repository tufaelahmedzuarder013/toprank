import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/settings";
import { MarkdownPage } from "@/components/info/info-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("how-it-works");
  return { title: page?.title, description: page?.body.replace(/[#*`>\[\]()\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: "/how-it-works" } };
}

export default async function HowItWorksPage() {
  const page = await getContentPage("how-it-works");
  if (!page) notFound();
  return <MarkdownPage eyebrow="Guide" active="/how-it-works" page={page} cta={true} />;
}

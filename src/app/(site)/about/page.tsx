import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/settings";
import { MarkdownPage } from "@/components/info/info-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("about");
  return { title: page?.title, description: page?.body.replace(/[#*`>\[\]()\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const page = await getContentPage("about");
  if (!page) notFound();
  return <MarkdownPage eyebrow="About" active="/about" page={page} cta={true} />;
}

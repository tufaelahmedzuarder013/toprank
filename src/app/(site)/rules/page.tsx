import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentPage } from "@/server/settings";
import { MarkdownPage } from "@/components/info/info-page";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentPage("rules");
  return { title: page?.title, description: page?.body.replace(/[#*`>\[\]()\\]/g, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: "/rules" } };
}

export default async function RulesPage() {
  const page = await getContentPage("rules");
  if (!page) notFound();
  return <MarkdownPage eyebrow="Rules" active="/rules" page={page} cta={true} />;
}

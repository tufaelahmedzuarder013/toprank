import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { db } from "@/server/db";
import { fillPlaceholders, getSettings } from "@/server/settings";
import { InfoLayout } from "@/components/info/info-page";
import { Markdown } from "@/components/ui/markdown";

export const metadata: Metadata = { title: "FAQ", description: "Answers to common questions about rankings, payments, upgrades and ownership.", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const [faqs, settings] = await Promise.all([db.faq.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }), getSettings()]);
  const items = faqs.map((f) => ({ id: f.id, q: fillPlaceholders(f.question, settings), a: fillPlaceholders(f.answer, settings) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <InfoLayout
      eyebrow="Help"
      title="Frequently asked questions"
      active="/faq"
      intro={
        <>
          Can&apos;t find what you need?{" "}
          <Link href="/contact" className="font-semibold text-foreground underline">
            Contact us
          </Link>
          .
        </>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {items.length ? (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {items.map((i) => (
            <details key={i.id} className="group">
              <summary className="flex list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                {i.q}
                <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-5 pb-5">
                <Markdown source={i.a} />
              </div>
            </details>
          ))}
        </div>
      ) : (
        <p className="text-muted">No questions published yet.</p>
      )}
    </InfoLayout>
  );
}

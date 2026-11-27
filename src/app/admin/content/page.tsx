import Link from "next/link";
import { db } from "@/server/db";
import { defaultContentPages } from "@/config/defaults";
import { deleteFaqAction, resetContentPageAction, saveContentPageAction, saveFaqAction } from "@/app/actions/admin";
import { ActionButton, AdminForm } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";

export const metadata = { title: "Pages & FAQ" };

export default async function AdminContent() {
  const [stored, faqs] = await Promise.all([db.contentPage.findMany(), db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })]);
  const pages = defaultContentPages.map((d) => ({ ...d, ...(stored.find((s) => s.slug === d.slug) ?? {}), custom: stored.some((s) => s.slug === d.slug) }));
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Pages & FAQ</h1>
        <p className="text-sm text-muted">
          Markdown supported: <code className="font-mono">## headings</code>, <code className="font-mono">- lists</code>, <code className="font-mono">**bold**</code>, <code className="font-mono">[links](/rules)</code>. Placeholders: <code className="font-mono">{"{{siteName}} {{minAmount}} {{topIncrement}} {{maxTotal}} {{contactEmail}}"}</code>.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-bold">Information pages</h2>
        {pages.map((p) => (
          <details key={p.slug} className="group rounded-2xl border border-border bg-surface shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.title}</span>
                <span className="block text-xs text-subtle">/{p.slug}</span>
              </span>
              {p.custom ? <Badge tone="brand">Edited</Badge> : <Badge>Default</Badge>}
            </summary>
            <div className="border-t border-border p-4">
              <Link href={`/${p.slug}`} className="mb-3 inline-block text-xs font-semibold text-brand-ink hover:underline" target="_blank">
                View live page ↗
              </Link>
              {(p.slug === "terms" || p.slug === "privacy") && (
                <p className="mb-3 rounded-xl border border-warning/30 bg-warning-soft p-3 text-[13px]">This default text is a starting draft, not legal advice. Have it reviewed for your business and jurisdiction before launch.</p>
              )}
              <AdminForm action={saveContentPageAction} submitLabel="Save page">
                <input type="hidden" name="slug" value={p.slug} />
                <div className="grid gap-3">
                  <Field label="Title" htmlFor={`t-${p.slug}`}>
                    <Input id={`t-${p.slug}`} name="title" defaultValue={p.title} maxLength={120} />
                  </Field>
                  <Field label="Body (Markdown)" htmlFor={`b-${p.slug}`}>
                    <Textarea id={`b-${p.slug}`} name="body" defaultValue={p.body} rows={16} className="font-mono text-[13px]" />
                  </Field>
                </div>
              </AdminForm>
              {p.custom && (
                <div className="mt-3 border-t border-border pt-3">
                  <ActionButton action={resetContentPageAction.bind(null, p.slug)} variant="ghost" confirm="Click again to reset" success="Reset to default">
                    Reset to default text
                  </ActionButton>
                </div>
              )}
            </div>
          </details>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-lg font-bold">FAQ</h2>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold">Add a question</h3>
          <AdminForm action={saveFaqAction} submitLabel="Add question">
            <FaqFields />
          </AdminForm>
        </Card>
        {faqs.map((f) => (
          <details key={f.id} className="group rounded-2xl border border-border bg-surface shadow-sm">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span className="w-8 text-xs text-subtle tabular">{f.sortOrder}</span>
              <span className="min-w-0 flex-1 font-medium">{f.question}</span>
              {!f.published && <Badge tone="warning">Hidden</Badge>}
            </summary>
            <div className="border-t border-border p-4">
              <AdminForm action={saveFaqAction}>
                <FaqFields f={f} />
              </AdminForm>
              <div className="mt-3 border-t border-border pt-3">
                <ActionButton action={deleteFaqAction.bind(null, f.id)} variant="danger-ghost" confirm="Click again to delete" success="Question deleted">
                  Delete
                </ActionButton>
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

function FaqFields({ f }: { f?: { id: string; question: string; answer: string; sortOrder: number; published: boolean } }) {
  const id = f?.id ?? "new";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_100px]">
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field label="Question" htmlFor={`q-${id}`}>
        <Input id={`q-${id}`} name="question" defaultValue={f?.question} maxLength={200} />
      </Field>
      <Field label="Order" htmlFor={`o-${id}`}>
        <Input id={`o-${id}`} name="sortOrder" type="number" min={0} max={999} defaultValue={f?.sortOrder ?? 100} />
      </Field>
      <Field label="Answer (Markdown)" htmlFor={`a-${id}`} className="sm:col-span-2">
        <Textarea id={`a-${id}`} name="answer" defaultValue={f?.answer} rows={4} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm font-medium sm:col-span-2">
        <input type="checkbox" name="published" defaultChecked={f?.published ?? true} className="size-4 accent-[var(--brand)]" /> Published
      </label>
    </div>
  );
}

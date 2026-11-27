import { getSettings } from "@/server/settings";
import { saveSettingsAction } from "@/app/actions/admin";
import { AdminForm } from "@/components/admin/admin-ui";
import { ColorField } from "@/components/admin/color-field";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";

export const metadata = { title: "Settings" };

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-sans text-[15px] font-bold">{title}</h2>
      <p className="mt-0.5 mb-5 text-sm text-muted">{description}</p>
      {children}
    </Card>
  );
}

const Check = ({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) => (
  <label className="flex items-center gap-2.5 text-sm font-medium">
    <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--brand)]" />
    {label}
  </label>
);

export default async function AdminSettings() {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Changes apply immediately across the site.</p>
      </div>

      <Section title="Brand" description="Site name, logo and brand colours. Text and button colours are adjusted automatically to keep contrast accessible.">
        <AdminForm action={saveSettingsAction}>
          <input type="hidden" name="section" value="brand" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Site name" htmlFor="s-name">
              <Input id="s-name" name="name" defaultValue={s.brand.name} maxLength={40} />
            </Field>
            <Field label="Tagline" htmlFor="s-tagline">
              <Input id="s-tagline" name="tagline" defaultValue={s.brand.tagline} maxLength={120} />
            </Field>
            <Field label="Description (SEO & footer)" htmlFor="s-desc" className="sm:col-span-2">
              <Textarea id="s-desc" name="description" defaultValue={s.brand.description} maxLength={300} rows={2} />
            </Field>
            <Field label="Logo URL" htmlFor="s-logo" hint="Square image, https://. Empty = built-in mark.">
              <Input id="s-logo" name="logoUrl" defaultValue={s.brand.logoUrl ?? ""} />
            </Field>
            <Field label="Contact email" htmlFor="s-email">
              <Input id="s-email" name="contactEmail" type="email" defaultValue={s.contactEmail} />
            </Field>
            <Field label="Accent colour" htmlFor="s-accent">
              <ColorField id="s-accent" name="accent" defaultValue={s.brand.accent} />
            </Field>
            <Field label="Secondary colour" htmlFor="s-secondary">
              <ColorField id="s-secondary" name="secondary" defaultValue={s.brand.secondary} />
            </Field>
          </div>
        </AdminForm>
      </Section>

      <Section title="Homepage text" description="Copy for the claim card and closing call-to-action, plus the paid-placement disclosure shown across the site.">
        <AdminForm action={saveSettingsAction}>
          <input type="hidden" name="section" value="home" />
          <div className="grid gap-4">
            <Field label="Claim card heading" htmlFor="h-heading">
              <Input id="h-heading" name="heading" defaultValue={s.home.heading} maxLength={80} />
            </Field>
            <Field label="Claim card text" htmlFor="h-sub">
              <Textarea id="h-sub" name="subheading" defaultValue={s.home.subheading} rows={2} maxLength={240} />
            </Field>
            <Field label="Rules note" htmlFor="h-rules">
              <Textarea id="h-rules" name="rulesNote" defaultValue={s.home.rulesNote} rows={2} maxLength={240} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Closing CTA heading" htmlFor="h-cta">
                <Input id="h-cta" name="ctaHeading" defaultValue={s.home.ctaHeading} maxLength={100} />
              </Field>
              <Field label="Closing CTA text" htmlFor="h-ctat">
                <Input id="h-ctat" name="ctaText" defaultValue={s.home.ctaText} maxLength={240} />
              </Field>
            </div>
            <Field label="Paid-placement disclosure" htmlFor="h-disc" hint="Shown on the claim card, every board, listing pages and the footer.">
              <Textarea id="h-disc" name="disclosure" defaultValue={s.disclosure} rows={2} maxLength={400} />
            </Field>
          </div>
        </AdminForm>
      </Section>

      <Section title="Ranking rules" description="Applied on the server to every new checkout. Existing listings and in-progress checkouts are not affected.">
        <AdminForm action={saveSettingsAction}>
          <input type="hidden" name="section" value="rules" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Minimum ($)" htmlFor="r-min">
              <Input id="r-min" name="minAmount" type="number" min={1} defaultValue={s.rules.minAmount} />
            </Field>
            <Field label="#1 increment ($)" htmlFor="r-top" hint="Above current #1">
              <Input id="r-top" name="topIncrement" type="number" min={1} defaultValue={s.rules.topIncrement} />
            </Field>
            <Field label="Overtake by ($)" htmlFor="r-over" hint="Above any other spot">
              <Input id="r-over" name="overtakeIncrement" type="number" min={1} defaultValue={s.rules.overtakeIncrement} />
            </Field>
            <Field label="Max total ($)" htmlFor="r-max">
              <Input id="r-max" name="maxTotal" type="number" min={1} defaultValue={s.rules.maxTotal} />
            </Field>
          </div>
        </AdminForm>
      </Section>

      <Section title="Featured & seasonal" description="Editorial sidebar blocks on the homepage. Featured spots are not paid placements.">
        <AdminForm action={saveSettingsAction}>
          <input type="hidden" name="section" value="featured" />
          <div className="grid gap-4">
            <Check name="enabled" defaultChecked={s.featured.enabled} label="Show the featured block" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Featured title" htmlFor="f-title">
                <Input id="f-title" name="title" defaultValue={s.featured.title} maxLength={60} />
              </Field>
              <Field label="Listing slugs" htmlFor="f-slugs" hint="Comma-separated, up to 6 (e.g. promptforge, shipyard-ci)">
                <Input id="f-slugs" name="listingSlugs" defaultValue={s.featured.listingSlugs.join(", ")} />
              </Field>
            </div>
            <Field label="Featured description" htmlFor="f-desc">
              <Input id="f-desc" name="description" defaultValue={s.featured.description} maxLength={240} />
            </Field>
            <hr className="border-border" />
            <Check name="seasonalEnabled" defaultChecked={s.seasonal.enabled} label="Show the seasonal banner" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Badge" htmlFor="se-badge">
                <Input id="se-badge" name="seasonalBadge" defaultValue={s.seasonal.badge} maxLength={24} />
              </Field>
              <Field label="Title" htmlFor="se-title">
                <Input id="se-title" name="seasonalTitle" defaultValue={s.seasonal.title} maxLength={60} />
              </Field>
              <Field label="Link (internal path)" htmlFor="se-href">
                <Input id="se-href" name="seasonalHref" defaultValue={s.seasonal.href} />
              </Field>
            </div>
            <Field label="Description" htmlFor="se-desc">
              <Input id="se-desc" name="seasonalDescription" defaultValue={s.seasonal.description} maxLength={240} />
            </Field>
          </div>
        </AdminForm>
      </Section>
    </div>
  );
}

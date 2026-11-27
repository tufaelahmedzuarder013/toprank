import { db } from "@/server/db";
import { deleteCategoryAction, saveCategoryAction, toggleCategoryAction } from "@/app/actions/admin";
import { CATEGORY_ICON_KEYS } from "@/config/icons";
import { ActionButton, AdminForm } from "@/components/admin/admin-ui";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input, NativeSelect } from "@/components/ui/input";

export const metadata = { title: "Categories" };

type Cat = { id: string; name: string; slug: string; icon: string; description: string; sortOrder: number };

function CategoryFields({ c }: { c?: Cat }) {
  const id = c?.id ?? "new";
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_90px]">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" htmlFor={`cn-${id}`}>
        <Input id={`cn-${id}`} name="name" defaultValue={c?.name} required maxLength={40} className="h-10" />
      </Field>
      <Field label="Slug" htmlFor={`cs-${id}`} hint={c ? undefined : "Leave empty to generate"}>
        <Input id={`cs-${id}`} name="slug" defaultValue={c?.slug} maxLength={48} className="h-10" />
      </Field>
      <Field label="Icon" htmlFor={`ci-${id}`}>
        <NativeSelect id={`ci-${id}`} name="icon" defaultValue={c?.icon ?? "sparkles"} className="h-10">
          {CATEGORY_ICON_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Order" htmlFor={`co-${id}`}>
        <Input id={`co-${id}`} name="sortOrder" type="number" min={0} max={999} defaultValue={c?.sortOrder ?? 100} className="h-10" />
      </Field>
      <Field label="Description" htmlFor={`cd-${id}`} className="sm:col-span-4">
        <Input id={`cd-${id}`} name="description" defaultValue={c?.description} maxLength={200} className="h-10" />
      </Field>
    </div>
  );
}

export default async function AdminCategories() {
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { listings: true } } } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Categories</h1>
        <p className="text-sm text-muted">Disabled categories disappear from the category bar and the claim form; their listings stay on the main board.</p>
      </div>
      <Card className="p-5">
        <h2 className="mb-4 font-sans text-[15px] font-bold">Add a category</h2>
        <AdminForm action={saveCategoryAction} submitLabel="Create category">
          <CategoryFields />
        </AdminForm>
      </Card>
      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id}>
            <details className="group rounded-2xl border border-border bg-surface shadow-sm">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="grid size-9 place-items-center rounded-xl bg-surface-2">
                  <CategoryIcon name={c.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{c.name}</span>
                  <span className="block text-xs text-subtle">
                    /{c.slug} · {c._count.listings} listings · order {c.sortOrder}
                  </span>
                </span>
                {!c.enabled && <Badge tone="warning">Disabled</Badge>}
                <span className="text-xs font-semibold text-brand-ink group-open:hidden">Edit</span>
              </summary>
              <div className="border-t border-border p-4">
                <AdminForm action={saveCategoryAction}>
                  <CategoryFields c={c} />
                </AdminForm>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <ActionButton action={toggleCategoryAction.bind(null, c.id, !c.enabled)} success={c.enabled ? "Category disabled" : "Category enabled"}>
                    {c.enabled ? "Disable" : "Enable"}
                  </ActionButton>
                  <ActionButton action={deleteCategoryAction.bind(null, c.id)} variant="danger-ghost" confirm="Click again to delete">
                    Delete
                  </ActionButton>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

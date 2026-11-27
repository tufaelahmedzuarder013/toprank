"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import type { FormState } from "@/app/actions/types";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";

type Listing = { id: string; name: string; description: string; logoUrl: string | null; categoryId: string };

/** Shared by the owner dashboard and the admin listing editor. */
export function EditListingForm({ listing, categories, action: serverAction, submitLabel = "Save changes" }: { listing: Listing; categories: { id: string; name: string }[]; action: (prev: FormState, fd: FormData) => Promise<FormState>; submitLabel?: string }) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="listingId" value={listing.id} />
      <Field label="Name" htmlFor={`n-${listing.id}`} error={fe.name}>
        <Input id={`n-${listing.id}`} name="name" defaultValue={listing.name} maxLength={60} required />
      </Field>
      <Field label="Category" htmlFor={`c-${listing.id}`} error={fe.categoryId}>
        <NativeSelect id={`c-${listing.id}`} name="categoryId" defaultValue={listing.categoryId}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Description" htmlFor={`d-${listing.id}`} error={fe.description} className="sm:col-span-2">
        <Textarea id={`d-${listing.id}`} name="description" defaultValue={listing.description} maxLength={200} rows={2} />
      </Field>
      <Field label="Logo URL" htmlFor={`l-${listing.id}`} error={fe.logoUrl} hint="https:// image, or leave empty for initials." className="sm:col-span-2">
        <Input id={`l-${listing.id}`} name="logoUrl" defaultValue={listing.logoUrl ?? ""} spellCheck={false} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2" aria-live="polite">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />} {submitLabel}
        </Button>
        {state.ok && <span className="text-sm text-success">{state.message}</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </ActionForm>
  );
}

"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { contactAction } from "@/app/actions/public";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, NativeSelect, Textarea } from "@/components/ui/input";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, initialFormState);
  const fe = state.fieldErrors ?? {};
  if (state.ok) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft p-5">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
        <p className="text-sm font-medium">{state.message}</p>
      </div>
    );
  }
  return (
    <ActionForm action={action} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:grid-cols-2 sm:p-6" noValidate>
      <Field label="Name" htmlFor="c-name" error={fe.name}>
        <Input id="c-name" name="name" autoComplete="name" required aria-invalid={Boolean(fe.name) || undefined} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={fe.email}>
        <Input id="c-email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe.email) || undefined} />
      </Field>
      <Field label="Topic" htmlFor="c-topic" className="sm:col-span-2">
        <NativeSelect id="c-topic" name="topic" defaultValue="general">
          <option value="general">General question</option>
          <option value="listing">A listing</option>
          <option value="payment">A payment or refund</option>
          <option value="removal">Report or removal request</option>
          <option value="partnership">Partnership or press</option>
          <option value="other">Something else</option>
        </NativeSelect>
      </Field>
      <Field label="Message" htmlFor="c-message" error={fe.message} className="sm:col-span-2">
        <Textarea id="c-message" name="message" rows={6} required aria-invalid={Boolean(fe.message) || undefined} />
      </Field>
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && <FieldError className="sm:col-span-2">{state.error}</FieldError>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />} Send message
        </Button>
      </div>
    </ActionForm>
  );
}

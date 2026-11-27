"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, Input } from "@/components/ui/input";

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required className="pr-11" aria-invalid={invalid || undefined} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe.email) || undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" invalid={Boolean(fe.password)} />
      </Field>
      {state.error && !fe.email && !fe.password && <FieldError className="rounded-xl bg-danger-soft p-3 text-[13px]">{state.error}</FieldError>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Sign in
      </Button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href={`/register${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-foreground underline">
          Create an account
        </Link>
      </p>
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(registerAction, initialFormState);
  const fe = state.fieldErrors ?? {};
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="Name" htmlFor="name" error={fe.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(fe.name) || undefined} />
      </Field>
      <Field label="Email" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(fe.email) || undefined} />
      </Field>
      <Field label="Password" htmlFor="password" error={fe.password} hint="At least 10 characters.">
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={Boolean(fe.password)} />
      </Field>
      <label className="flex items-start gap-3 text-[13px] text-muted">
        <Checkbox name="terms" className="mt-0.5" aria-invalid={Boolean(fe.terms) || undefined} />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-semibold text-foreground underline" target="_blank">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-foreground underline" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {state.error && <FieldError className="rounded-xl bg-danger-soft p-3 text-[13px]">{state.error}</FieldError>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-foreground underline">
          Sign in
        </Link>
      </p>
    </ActionForm>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 pt-12 sm:px-6">
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-lg sm:p-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

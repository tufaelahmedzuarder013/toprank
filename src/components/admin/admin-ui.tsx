"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import type { FormState } from "@/app/actions/types";
import { initialFormState } from "@/app/actions/types";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Runs a server action from a button; destructive actions ask for a second click. */
export function ActionButton({
  action,
  children,
  confirm,
  success,
  ...props
}: Omit<ButtonProps, "onClick" | "action"> & { action: () => Promise<unknown>; confirm?: string; success?: string }) {
  const [pending, start] = useTransition();
  const [arming, setArming] = useState(false);
  const run = () => {
    if (confirm && !arming) {
      setArming(true);
      setTimeout(() => setArming(false), 4000);
      return;
    }
    setArming(false);
    start(async () => {
      const res = (await action()) as FormState | undefined;
      if (res && typeof res === "object" && "error" in res && res.error) toast.error(res.error);
      else if (res && typeof res === "object" && "message" in res && res.message) toast.success(res.message);
      else if (success) toast.success(success);
    });
  };
  return (
    <Button type="button" size="xs" variant="secondary" {...props} onClick={run} disabled={pending || props.disabled}>
      {pending && <LoaderCircle className="animate-spin" />}
      {arming ? confirm : children}
    </Button>
  );
}

/** Wraps a <form> around a FormState server action and reports the outcome inline. */
export function AdminForm({ action: serverAction, children, submitLabel = "Save", className }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; children: React.ReactNode; submitLabel?: string; className?: string }) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const errors = Object.entries(state.fieldErrors ?? {}).filter(([, v]) => v);
  return (
    <ActionForm action={action} className={className} noValidate>
      {children}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-0.5 rounded-xl bg-danger-soft p-3 text-[13px] text-danger" role="alert">
          {errors.map(([k, v]) => (
            <li key={k}>
              <strong className="font-semibold">{k}</strong>: {v}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3" aria-live="polite">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" />} {submitLabel}
        </Button>
        {state.ok && state.message && <span className="text-sm text-success">{state.message}</span>}
        {state.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </ActionForm>
  );
}

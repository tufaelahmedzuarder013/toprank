"use client";

import { startTransition } from "react";

/**
 * A <form> for useActionState dispatchers that keeps what the user typed when the server
 * returns validation errors. (React resets uncontrolled forms after every action, which
 * would wipe the fields.) Without JavaScript it still posts through the `action` attribute.
 */
export function ActionForm({ action, children, ...props }: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & { action: (fd: FormData) => void }) {
  return (
    <form
      {...props}
      action={action}
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => action(fd));
      }}
    >
      {children}
    </form>
  );
}

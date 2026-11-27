"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { CircleCheck, FileText, FlaskConical, Globe, Hand, LoaderCircle, Code } from "lucide-react";
import { requestManualReviewAction, verifyOwnershipAction } from "@/app/actions/owner";
import { initialFormState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bioCode } from "@/lib/verification";
import { CopyField } from "./copy-field";

type Method = "DNS" | "META" | "FILE" | "DEMO" | "MANUAL";

export function VerifyPanel({ listingId, kind, host, siteUrl, token, verifyKey, verifyFile, demo, manualRequested }: { listingId: string; kind: "WEBSITE" | "X_PROFILE"; host: string; siteUrl: string; token: string; verifyKey: string; verifyFile: string; demo: boolean; manualRequested: boolean }) {
  const methods: { key: Method; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    kind === "WEBSITE"
      ? [
          { key: "DNS", label: "DNS record", icon: Globe },
          { key: "META", label: "Meta tag", icon: Code },
          { key: "FILE", label: "HTML file", icon: FileText },
          ...(demo ? [{ key: "DEMO" as Method, label: "Demo", icon: FlaskConical }] : []),
        ]
      : [{ key: "MANUAL", label: "Profile bio", icon: Hand }, ...(demo ? [{ key: "DEMO" as Method, label: "Demo", icon: FlaskConical }] : [])];
  const [method, setMethod] = useState<Method>(methods[0].key);
  const [state, action, pending] = useActionState(verifyOwnershipAction, initialFormState);
  const [manual, manualAction, manualPending] = useActionState(requestManualReviewAction, initialFormState);
  const value = `${verifyKey}=${token}`;

  return (
    <div>
      <div role="tablist" aria-label="Verification method" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-2 p-1">
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={method === m.key}
            onClick={() => setMethod(m.key)}
            className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors", method === m.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground")}
          >
            <m.icon className="size-3.5" /> {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3 text-sm" role="tabpanel">
        {method === "DNS" && (
          <>
            <p className="text-muted">
              Add a <strong className="text-foreground">TXT record</strong> to <code className="font-mono text-foreground">{host}</code> (or <code className="font-mono text-foreground">_toprung.{host}</code>) with this value:
            </p>
            <CopyField value={value} label="TXT record value" />
            <p className="text-xs text-subtle">DNS changes can take a few minutes to propagate.</p>
          </>
        )}
        {method === "META" && (
          <>
            <p className="text-muted">
              Add this tag inside the <code className="font-mono text-foreground">&lt;head&gt;</code> of your homepage (<code className="font-mono text-foreground">{siteUrl}</code>):
            </p>
            <CopyField value={`<meta name="${verifyKey}" content="${token}">`} label="Meta tag" />
          </>
        )}
        {method === "FILE" && (
          <>
            <p className="text-muted">Upload a plain-text file at this path containing just the code:</p>
            <CopyField value={`https://${host}${verifyFile}`} label="File URL" />
            <CopyField value={token} label="File contents" />
          </>
        )}
        {method === "DEMO" && (
          <p className="rounded-xl border border-brand-2/25 bg-brand-2-soft p-3 text-brand-2-ink">
            <strong>Demo mode only:</strong> instantly mark yourself as the owner so you can try upgrades. This option disappears when a payment provider is configured.
          </p>
        )}
        {method === "MANUAL" && (
          <>
            <p className="text-muted">
              Add this code to your <strong className="text-foreground">{host}</strong> profile bio, then request a review. An admin checks it and approves ownership — you can remove the code afterwards.
            </p>
            <CopyField value={bioCode(token)} label="Bio code" />
            {manual.message || manualRequested ? (
              <p className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-muted">
                <CircleCheck className="size-4 text-success" /> {manual.message ?? "Review requested — an admin will check your profile soon."}
              </p>
            ) : (
              <ActionForm action={manualAction}>
                <input type="hidden" name="listingId" value={listingId} />
                <Button type="submit" disabled={manualPending}>
                  {manualPending && <LoaderCircle className="animate-spin" />} Request review
                </Button>
              </ActionForm>
            )}
            {manual.error && <p className="text-danger">{manual.error}</p>}
          </>
        )}

        {method !== "MANUAL" && (
          <ActionForm action={action} className="pt-1">
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="method" value={method} />
            <Button type="submit" disabled={pending} variant={method === "DEMO" ? "violet" : "primary"}>
              {pending && <LoaderCircle className="animate-spin" />} {method === "DEMO" ? "Verify instantly (demo)" : "Check now"}
            </Button>
          </ActionForm>
        )}
        <div aria-live="polite">
          {state.error && <p className="rounded-xl bg-danger-soft p-3 text-[13px] text-danger">{state.error}</p>}
          {state.ok && <p className="rounded-xl bg-success-soft p-3 text-[13px] text-success">{state.message}</p>}
        </div>
      </div>
    </div>
  );
}

import { FlaskConical } from "lucide-react";
import { paymentMode, isStripeTestMode } from "@/server/payment-provider";

/** Always-visible notice while payments are simulated or running on Stripe test keys. */
export function DemoBanner() {
  const mode = paymentMode();
  if (mode === "stripe" && !isStripeTestMode()) return null;
  return (
    <div className="border-b border-brand-2/20 bg-brand-2-soft text-foreground">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium sm:px-6">
        <FlaskConical className="size-3.5 shrink-0 text-brand-2-ink" aria-hidden />
        {mode === "demo" ? (
          <span>
            <strong>Demo mode</strong> — checkout is simulated and listings marked “Demo” are sample data. No real money moves.
          </span>
        ) : (
          <span>
            <strong>Stripe test mode</strong> — use test cards like 4242 4242 4242 4242. No real money moves.
          </span>
        )}
      </p>
    </div>
  );
}

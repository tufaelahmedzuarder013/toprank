import type { Metadata } from "next";
import { getSettings } from "@/server/settings";
import { getBoardEntries, getEnabledCategories } from "@/server/leaderboard";
import { getCurrentUser } from "@/server/auth";
import { paymentMode } from "@/server/payment-provider";
import { ClaimFlow } from "@/components/claim/claim-flow";
import { formatUsd } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Claim a rank",
  description: "Submit your website or X profile, choose an amount and claim your place on the leaderboard.",
  alternates: { canonical: "/claim" },
};

export default async function ClaimPage({ searchParams }: PageProps<"/claim">) {
  const sp = await searchParams;
  const [settings, categories, entries, user] = await Promise.all([getSettings(), getEnabledCategories(), getBoardEntries(), getCurrentUser()]);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const amount = str(sp.amount).replace(/[^\d]/g, "").slice(0, 9);
  const category = categories.some((c) => c.slug === str(sp.category)) ? str(sp.category) : "";
  const totals = entries.map((e) => e.total);
  const defaultAmount = amount || String(totals.length ? Math.max(settings.rules.minAmount, (totals[Math.min(9, totals.length - 1)] ?? 0) + settings.rules.overtakeIncrement) : settings.rules.minAmount);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="mb-6 max-w-2xl">
        <p className="text-xs font-bold tracking-wider text-brand-ink uppercase">Claim a rank</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Put your product on the board</h1>
        <p className="mt-2 text-[15px] text-muted">
          {totals.length ? (
            <>
              {totals.length} listings are live. The current #1 sits at {formatUsd(totals[0])} — anything from {formatUsd(settings.rules.minAmount)} gets you on the board.
            </>
          ) : (
            <>The board is empty — the first claim takes #1.</>
          )}
        </p>
      </div>
      <ClaimFlow
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        totals={totals}
        rules={settings.rules}
        disclosure={settings.disclosure}
        mode={paymentMode()}
        signedIn={Boolean(user)}
        initial={{ target: str(sp.target).slice(0, 2048), amount: defaultAmount, category }}
      />
    </div>
  );
}

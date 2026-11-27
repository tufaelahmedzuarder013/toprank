import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { AuthShell, LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const safe = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safe((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your listings, verify ownership and upgrade.">
      <LoginForm next={next} />
    </AuthShell>
  );
}

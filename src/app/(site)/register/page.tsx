import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { AuthShell, RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

const safe = (v: unknown) => (typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const next = safe((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthShell title="Create your account" subtitle="Free. You only need an account to verify ownership, edit and upgrade your listings.">
      <RegisterForm next={next} />
    </AuthShell>
  );
}

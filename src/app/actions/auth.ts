"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/server/auth";
import { fieldErrors, safeNext, str } from "@/server/forms";
import { clientIp, rateLimit } from "@/server/rate-limit";
import type { FormState } from "./types";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(160);
const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(200) });
const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(60),
  email,
  password: z.string().min(10, "Use at least 10 characters.").max(200),
});

// Verifying against a dummy hash keeps response times similar for unknown emails.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  const parsed = loginSchema.safeParse({ email: str(formData, "email"), password: str(formData, "password") });
  if (!parsed.success) return { error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const limited = !rateLimit(`login:ip:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:email:${parsed.data.email}`, 8, 15 * 60_000).ok;
  if (limited) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "That email and password don't match." };
  await startSession(user.id);
  redirect(safeNext(formData.get("next"), user.role === "ADMIN" ? "/admin" : "/dashboard"));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({ name: str(formData, "name"), email: str(formData, "email"), password: str(formData, "password") });
  if (!parsed.success) return { error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  if (formData.get("terms") !== "on") return { error: "Please accept the terms to create an account.", fieldErrors: { terms: "Required" } };
  // Only complete sign-up attempts count toward the limit, so typos don't lock people out.
  if (!rateLimit(`register:${await clientIp()}`, 10, 60 * 60_000).ok) return { error: "Too many accounts created from this network. Please try again later." };

  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { error: "An account with this email already exists. Try signing in.", fieldErrors: { email: "Already registered" } };
  const user = await db.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password) } });
  await startSession(user.id);
  redirect(safeNext(formData.get("next"), "/dashboard"));
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

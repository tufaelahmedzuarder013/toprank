import "server-only";
import { cookies } from "next/headers";

/**
 * Remembers which checkouts were started in this browser, so only the person who
 * started a checkout can cancel it (or drive the demo checkout) from the return pages.
 */
const COOKIE = "tr_checkouts";
const MAX = 6;

async function read(): Promise<string[]> {
  const raw = (await cookies()).get(COOKIE)?.value ?? "";
  return raw.split(".").filter((id) => /^[a-z0-9]{10,40}$/i.test(id));
}

export async function rememberCheckout(paymentId: string) {
  const ids = [paymentId, ...(await read()).filter((id) => id !== paymentId)].slice(0, MAX);
  (await cookies()).set(COOKIE, ids.join("."), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 6 });
}

export async function ownsCheckout(paymentId: string) {
  return (await read()).includes(paymentId);
}

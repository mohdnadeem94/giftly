"use server";

// Simulated sign-in for the hackathon demo. There are no accounts or passwords:
// "signing in" just switches this browser to the Donor demo role and remembers a display name.
import { cookies } from "next/headers";
import { CHARITY_COOKIE, DONOR_NAME_COOKIE, ROLE_COOKIE, safeNext } from "@/lib/roles";
import { db } from "@/lib/db";

// Not httpOnly: the demo role switcher in the header changes these cookies in the browser too.
const opts = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" };

function cleanName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 40);
}

export async function demoSignIn(input: { name: string; next: string; ask?: string }): Promise<{ ok: true; to: string } | { ok: false; error: string }> {
  const name = cleanName(input.name);
  if (name.length < 2) return { ok: false, error: "Please enter a display name (at least 2 characters)." };

  const store = await cookies();
  store.set(ROLE_COOKIE, "donor", opts);
  store.set(DONOR_NAME_COOKIE, encodeURIComponent(name), opts);

  let to = safeNext(input.next);
  const ask = typeof input.ask === "string" ? input.ask.trim().slice(0, 600) : "";
  if (ask) to += `${to.includes("?") ? "&" : "?"}ask=${encodeURIComponent(ask)}`;
  return { ok: true, to };
}

/** Demo shortcut: open the charity view instead. */
export async function demoSignInAsCharity(): Promise<{ ok: true; to: string }> {
  const store = await cookies();
  store.set(ROLE_COOKIE, "charity", opts);
  if (!store.get(CHARITY_COOKIE)?.value) {
    const first = await db.charity.findFirst({ select: { slug: true }, orderBy: { name: "asc" } });
    if (first) store.set(CHARITY_COOKIE, first.slug, opts);
  }
  return { ok: true, to: "/charity" };
}

/** Back to the public view. */
export async function demoSignOut(): Promise<{ ok: true }> {
  const store = await cookies();
  store.set(ROLE_COOKIE, "public", opts);
  store.delete(DONOR_NAME_COOKIE);
  return { ok: true };
}

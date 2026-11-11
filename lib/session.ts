// Reads the demo role from cookies (server only).
import { cookies } from "next/headers";
import { CHARITY_COOKIE, DONOR_NAME_COOKIE, ROLE_COOKIE, isRole, type Role } from "@/lib/roles";

export async function getDemoSession(): Promise<{ role: Role; charitySlug: string | null; donorName: string | null }> {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value;
  const name = store.get(DONOR_NAME_COOKIE)?.value;
  return {
    role: isRole(raw) ? raw : "public",
    charitySlug: store.get(CHARITY_COOKIE)?.value ?? null,
    donorName: name ? decodeURIComponent(name).replace(/[<>]/g, "").slice(0, 40) || null : null,
  };
}

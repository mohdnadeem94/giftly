// Reads the demo role from cookies (server only).
import { cookies } from "next/headers";
import { CHARITY_COOKIE, ROLE_COOKIE, isRole, type Role } from "@/lib/roles";

export async function getDemoSession(): Promise<{ role: Role; charitySlug: string | null }> {
  const store = await cookies();
  const raw = store.get(ROLE_COOKIE)?.value;
  return {
    role: isRole(raw) ? raw : "public",
    charitySlug: store.get(CHARITY_COOKIE)?.value ?? null,
  };
}

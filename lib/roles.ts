// Demo roles (shared by server and client). No real login: this is a UI convenience only.
// Server routes must still validate every action on their own.
export const ROLES = ["public", "donor", "charity", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  public: "Public",
  donor: "Donor",
  charity: "Charity",
  admin: "Admin",
};

export const ROLE_COOKIE = "giftly_role";
export const CHARITY_COOKIE = "giftly_charity";

/** Remembers the name a donor used at the (simulated) sign-in. Display only, never trusted. */
export const DONOR_NAME_COOKIE = "giftly_name";

/** Who may give and chat with the Elf. Public visitors are sent to the simulated sign-in first. */
export function canGive(role: Role): boolean {
  return role === "donor" || role === "admin";
}

/** Only allow redirects to our own pages (prevents open redirects). */
export function safeNext(next: string | null | undefined): string {
  const n = String(next ?? "");
  return n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") && n.length <= 300 ? n : "/";
}

/** Link to the simulated sign-in, returning to `next` (and optionally asking the Elf `ask`). */
export function signInHref(next: string, ask?: string): string {
  return `/sign-in?next=${encodeURIComponent(safeNext(next))}${ask ? `&ask=${encodeURIComponent(ask.slice(0, 600))}` : ""}`;
}

export function isRole(value: string | undefined | null): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

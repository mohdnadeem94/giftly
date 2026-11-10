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

export function isRole(value: string | undefined | null): value is Role {
  return !!value && (ROLES as readonly string[]).includes(value);
}

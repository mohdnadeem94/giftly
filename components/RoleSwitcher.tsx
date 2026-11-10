"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHARITY_COOKIE, ROLE_COOKIE, ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

type Props = {
  role: Role;
  charitySlug: string | null;
  charities: { slug: string; name: string }[];
};

// Demo-only role switcher. Not authentication.
export default function RoleSwitcher({ role, charitySlug, charities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  const currentCharity = charities.find((c) => c.slug === charitySlug)?.slug ?? charities[0]?.slug ?? "";

  function chooseRole(next: Role) {
    setCookie(ROLE_COOKIE, next);
    if (next === "charity" && currentCharity) setCookie(CHARITY_COOKIE, currentCharity);
    refresh();
  }

  function chooseCharity(slug: string) {
    setCookie(CHARITY_COOKIE, slug);
    refresh();
  }

  return (
    <div className={pending ? "roles is-pending" : "roles"} aria-label="Demo role switcher" aria-busy={pending}>
      <span className="roles-label">
        {pending ? <span className="spinner spinner-small spinner-light" aria-hidden="true" /> : null} Demo role
      </span>
      <div className="roles-buttons">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={r === role ? "role active" : "role"}
            aria-pressed={r === role}
            onClick={() => chooseRole(r)}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      {role === "charity" && charities.length > 0 && (
        <select
          className="charity-select"
          value={currentCharity}
          onChange={(e) => chooseCharity(e.target.value)}
          aria-label="Charity you are acting as"
        >
          {charities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { CHARITY_COOKIE, ROLE_COOKIE, ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

type Props = {
  role: Role;
  charitySlug: string | null;
  charities: { slug: string; name: string }[];
};

// Demo-only role switcher. Not authentication: server routes validate every action themselves.
export default function RoleSwitcher({ role, charitySlug, charities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  const currentCharity = charities.find((c) => c.slug === charitySlug)?.slug ?? charities[0]?.slug ?? "";

  function chooseRole(next: Role) {
    setCookie(ROLE_COOKIE, next);
    if ((next === "charity" || next === "admin") && currentCharity) setCookie(CHARITY_COOKIE, currentCharity);
    refresh();
  }

  function chooseCharity(slug: string) {
    setCookie(CHARITY_COOKIE, slug);
    refresh();
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }} aria-busy={pending}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={role}
        disabled={pending}
        onChange={(_, next: Role | null) => next && chooseRole(next)}
        aria-label="Demo role"
        sx={{
          bgcolor: "background.paper",
          borderRadius: 999,
          p: 0.4,
          border: "1px solid",
          borderColor: "divider",
          "& .MuiToggleButton-root": {
            border: 0,
            borderRadius: "999px !important",
            px: 1.5,
            py: 0.4,
            color: "text.secondary",
          },
          "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
            bgcolor: "#166534",
            color: "#ffffff",
          },
          "& .MuiToggleButton-root.Mui-disabled.Mui-selected": {
            bgcolor: "#166534",
            color: "rgba(255,255,255,0.8)",
          },
        }}
      >
        {ROLES.map((r) => (
          <ToggleButton key={r} value={r}>
            {ROLE_LABELS[r]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {(role === "charity" || role === "admin") && charities.length > 0 && (
        <Select
          size="small"
          value={currentCharity}
          onChange={(e) => chooseCharity(String(e.target.value))}
          disabled={pending}
          aria-label="Charity you are acting as"
          sx={{ borderRadius: 999, bgcolor: "background.paper", fontSize: "0.85rem", maxWidth: 220 }}
        >
          {charities.map((c) => (
            <MenuItem key={c.slug} value={c.slug}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      )}
      {pending && <CircularProgress size={18} aria-label="Switching role" />}
    </Box>
  );
}

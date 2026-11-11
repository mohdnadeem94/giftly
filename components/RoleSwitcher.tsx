"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ElfLoader from "@/components/ElfLoader";
import { CHARITY_COOKIE, ROLE_COOKIE, ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

type Props = {
  role: Role;
  charitySlug: string | null;
  charities: { slug: string; name: string }[];
  /** Lets the header update its links the moment the role changes (before the server responds). */
  onRoleChange?: (role: Role) => void;
};

const ROLE_MESSAGE: Record<Role, string> = {
  public: "Switching to the public view…",
  donor: "Switching to the donor view…",
  charity: "Opening the charity view…",
  admin: "Opening the admin view…",
};

// Demo-only role switcher. Not authentication: server routes validate every action themselves.
export default function RoleSwitcher({ role, charitySlug, charities, onRoleChange }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const serverCharity = charities.find((c) => c.slug === charitySlug)?.slug ?? charities[0]?.slug ?? "";

  // Show the new choice immediately while the page refreshes in the background.
  const [shownRole, setShownRole] = useState<Role>(role);
  const [shownCharity, setShownCharity] = useState(serverCharity);
  const [message, setMessage] = useState("");
  useEffect(() => setShownRole(role), [role]);
  useEffect(() => setShownCharity(serverCharity), [serverCharity]);

  // Only show the full-page overlay if the switch takes a moment (avoids a flash on fast switches).
  const [showOverlay, setShowOverlay] = useState(false);
  useEffect(() => {
    if (!pending) {
      setShowOverlay(false);
      return;
    }
    const t = setTimeout(() => setShowOverlay(true), 250);
    return () => clearTimeout(t);
  }, [pending]);

  const refresh = (msg: string, goTo?: string) => {
    setMessage(msg);
    startTransition(() => {
      // The header lives in the shared layout, which a client-side push does NOT re-render.
      // Always refresh too, so every part of the page (header included) reflects the new role.
      if (goTo) router.push(goTo);
      router.refresh();
    });
  };

  /** Pages that only make sense for one role: leave them when switching to another role. */
  function landingFor(next: Role): string | undefined {
    if (pathname.startsWith("/give") && next === "charity") return "/charity"; // charities don't give
    if (pathname.startsWith("/sign-in") && next !== "public" && next !== "admin") return next === "donor" ? "/" : "/charity";
    if (pathname.startsWith("/charity") && next !== "charity" && next !== "admin") return next === "donor" ? "/my-gifts" : "/";
    if (pathname.startsWith("/my-gifts") && next !== "donor" && next !== "admin") return next === "charity" ? "/charity" : "/";
    if (pathname.startsWith("/elf-test") && next !== "admin") return next === "charity" ? "/charity" : "/";
    if (pathname.startsWith("/admin") && next !== "admin") return next === "charity" ? "/charity" : next === "donor" ? "/my-gifts" : "/";
    if (next === "admin" && (pathname.startsWith("/charity") || pathname.startsWith("/my-gifts") || pathname.startsWith("/sign-in"))) return "/admin";
    return undefined;
  }

  function chooseRole(next: Role) {
    setShownRole(next);
    onRoleChange?.(next);
    setCookie(ROLE_COOKIE, next);
    if ((next === "charity" || next === "admin") && shownCharity) setCookie(CHARITY_COOKIE, shownCharity);
    refresh(ROLE_MESSAGE[next], landingFor(next));
  }

  function chooseCharity(slug: string) {
    setShownCharity(slug);
    setCookie(CHARITY_COOKIE, slug);
    const name = charities.find((c) => c.slug === slug)?.name ?? "the charity";
    refresh(`Opening ${name}…`);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }} aria-busy={pending}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={shownRole}
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
            px: { xs: 1, sm: 1.5 },
            minHeight: 44,
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
      {(shownRole === "charity" || (shownRole === "admin" && pathname.startsWith("/charity"))) && charities.length > 0 && (
        <Select
          size="small"
          value={shownCharity}
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
      {pending && <CircularProgress size={18} aria-label="Switching" />}

      {/* Full-page overlay while the page reloads for the new role/charity */}
      <Backdrop
        open={pending && showOverlay}
        sx={{ zIndex: (t) => t.zIndex.modal + 1, bgcolor: "rgba(250,247,242,0.72)", backdropFilter: "blur(3px)" }}
      >
        <Paper elevation={0} sx={{ px: 5, border: "1px solid", borderColor: "divider", boxShadow: "0 24px 60px rgba(28,25,23,0.15)", width: "min(360px, calc(100vw - 32px))" }}>
          {pending && <ElfLoader compact messages={[message || "Switching…", "Getting things ready…", "The Elf is tidying up…"]} />}
        </Paper>
      </Backdrop>
    </Box>
  );
}

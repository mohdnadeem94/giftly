"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import Logo from "./Logo";
import RoleSwitcher from "./RoleSwitcher";
import { signInHref, type Role } from "@/lib/roles";
import { demoSignOut } from "@/app/sign-in/actions";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/causes", label: "Causes" },
];

type Props = { role: Role; charitySlug: string | null; charities: { slug: string; name: string }[]; donorName?: string | null };

export default function AppHeader({ role, charitySlug, charities, donorName }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  // The role shown in the header: changes instantly when switching, then follows the server.
  const [navRole, setNavRole] = useState<Role>(role);
  useEffect(() => setNavRole(role), [role]);
  const nav = [
    ...NAV,
    ...(navRole === "donor" ? [{ href: "/my-gifts", label: "My gifts" }] : []),
    ...(navRole === "charity" ? [{ href: "/charity", label: "Dashboard" }] : []),
    ...(navRole === "admin"
      ? [
          { href: "/admin", label: "Admin console" },
          { href: "/charity", label: "Charity view" },
          { href: "/elf-test", label: "Elf tests" },
        ]
      : []),
  ];

  return (
    <>
      <Box
        sx={{
          bgcolor: "#14532d",
          color: "rgba(255,255,255,0.9)",
          py: 0.6,
          px: 2,
          textAlign: "center",
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        <ScienceOutlinedIcon sx={{ fontSize: 14, verticalAlign: "-2px", mr: 0.5 }} />
        Hackathon demo · PayPal sandbox only · No real money moves
      </Box>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: "rgba(250,247,242,0.85)",
          backdropFilter: "saturate(180%) blur(12px)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: { xs: 64 }, flexWrap: "wrap", py: { xs: 1, md: 0 } }}>
            <Box component={NextLink} href="/" sx={{ textDecoration: "none", display: "flex" }} aria-label="Giftly home">
              <Logo />
            </Box>
            <Box component="nav" aria-label="Main navigation" sx={{ display: "flex", gap: 0.5, order: { xs: 3, md: 0 }, width: { xs: "100%", md: "auto" }, overflowX: "auto", pb: { xs: 0.5, md: 0 } }}>
              {nav.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.href}
                    component={NextLink}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    color="inherit"
                    sx={{
                      color: active ? "primary.main" : "text.secondary",
                      bgcolor: active ? "rgba(22,101,52,0.08)" : "transparent",
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
            <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", maxWidth: "100%" }}>
              {navRole === "public" && pathname !== "/sign-in" && (
                <Button component={NextLink} href={signInHref(pathname || "/")} variant="contained" size="small" sx={{ whiteSpace: "nowrap" }}>
                  Sign in
                </Button>
              )}
              {navRole === "donor" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: "none", sm: "block" }, whiteSpace: "nowrap" }}>
                    Hi, {donorName || "donor"}
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={signingOut}
                    sx={{ color: "text.secondary", whiteSpace: "nowrap" }}
                    onClick={() =>
                      startSignOut(async () => {
                        setNavRole("public");
                        await demoSignOut();
                        router.push("/");
                        router.refresh();
                      })
                    }
                  >
                    Sign out
                  </Button>
                </Box>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", lg: "block" }, fontWeight: 600 }}>
                Demo role
              </Typography>
              <RoleSwitcher role={role} charitySlug={charitySlug} charities={charities} onRoleChange={setNavRole} />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}

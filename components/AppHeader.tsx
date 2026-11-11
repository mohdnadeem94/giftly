"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import Logo from "./Logo";
import RoleSwitcher from "./RoleSwitcher";
import type { Role } from "@/lib/roles";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/causes", label: "Causes" },
];

type Props = { role: Role; charitySlug: string | null; charities: { slug: string; name: string }[] };

export default function AppHeader({ role, charitySlug, charities }: Props) {
  const pathname = usePathname();
  const nav = [
    ...NAV,
    ...(role === "donor" ? [{ href: "/my-gifts", label: "My gifts" }] : []),
    ...(role === "charity" || role === "admin" ? [{ href: "/charity", label: "Dashboard" }] : []),
    ...(role === "admin" ? [{ href: "/elf-test", label: "Elf tests" }] : []),
  ];

  return (
    <>
      <Box
        sx={{
          bgcolor: "#14532d",
          color: "rgba(255,255,255,0.9)",
          py: 0.6,
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
            <Box component="nav" sx={{ display: "flex", gap: 0.5 }}>
              {nav.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Button
                    key={item.href}
                    component={NextLink}
                    href={item.href}
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
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, fontWeight: 600 }}>
                Demo role
              </Typography>
              <RoleSwitcher role={role} charitySlug={charitySlug} charities={charities} />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}

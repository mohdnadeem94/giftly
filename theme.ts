"use client";

import { createTheme } from "@mui/material/styles";

// Giftly theme: warm, modern holiday palette (pine green + cranberry on a soft cream background).
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#166534", dark: "#14532d", light: "#4ade80", contrastText: "#ffffff" },
    secondary: { main: "#be123c", dark: "#9f1239", light: "#fda4af", contrastText: "#ffffff" },
    warning: { main: "#d97706" },
    info: { main: "#2563eb" },
    success: { main: "#15803d" },
    background: { default: "#faf7f2", paper: "#ffffff" },
    text: { primary: "#1c1917", secondary: "#57534e" },
    divider: "#ece6dc",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "var(--font-sans), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.025em" },
    h3: { fontWeight: 800, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.015em" },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: "0.12em" },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 18 },
        sizeLarge: { paddingBlock: 12, paddingInline: 28, fontSize: "1rem" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #ece6dc",
          borderRadius: 20,
          boxShadow: "0 1px 2px rgba(28,25,23,0.04), 0 8px 24px rgba(28,25,23,0.04)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 20 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiToggleButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 999, backgroundColor: "#f1ebe1" },
        bar: { borderRadius: 999 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: "#57534e", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" },
      },
    },
  },
});

export default theme;

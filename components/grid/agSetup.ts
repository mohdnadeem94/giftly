"use client";

// Shared AG Grid setup (Community edition): register modules once and share one Giftly theme.
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export const gridTheme = themeQuartz.withParams({
  accentColor: "#166534",
  fontFamily: "inherit",
  headerFontWeight: 700,
  headerBackgroundColor: "#faf7f2",
  borderRadius: 10,
  wrapperBorderRadius: 16,
  fontSize: 14,
});

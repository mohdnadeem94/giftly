"use client";

import Box from "@mui/material/Box";

const STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  RECEIVED: { label: "Received", bg: "#dcfce7", fg: "#166534" },
  PAID: { label: "Paid", bg: "#fef3c7", fg: "#92400e" },
  BOUGHT: { label: "Bought", bg: "#dbeafe", fg: "#1e40af" },
  DELIVERED: { label: "Delivered", bg: "#dcfce7", fg: "#166534" },
  PENDING: { label: "Pending", bg: "#f5f5f4", fg: "#57534e" },
};

/** Status pill for AG Grid cells. */
export default function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return null;
  const s = STYLES[value] ?? { label: value, bg: "#f5f5f4", fg: "#57534e" };
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Box component="span" sx={{ px: 1.25, py: 0.35, borderRadius: 999, bgcolor: s.bg, color: s.fg, fontWeight: 800, fontSize: 12.5, lineHeight: 1.5 }}>
        {s.label}
      </Box>
    </Box>
  );
}

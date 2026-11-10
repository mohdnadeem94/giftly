import Chip from "@mui/material/Chip";

const STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  PENDING: { label: "Pending", bg: "#f5f5f4", fg: "#57534e" },
  RECEIVED: { label: "Received", bg: "#dcfce7", fg: "#166534" },
  PAID: { label: "Paid", bg: "#fef3c7", fg: "#92400e" },
  BOUGHT: { label: "Bought", bg: "#dbeafe", fg: "#1e40af" },
  DELIVERED: { label: "Delivered", bg: "#dcfce7", fg: "#166534" },
  CANCELLED: { label: "Cancelled", bg: "#f5f5f4", fg: "#57534e" },
  OPEN: { label: "Open", bg: "#ffe4e6", fg: "#9f1239" },
  FUNDED: { label: "Funded", bg: "#fef3c7", fg: "#92400e" },
  FULFILLED: { label: "Fulfilled", bg: "#dcfce7", fg: "#166534" },
};

export default function StatusChip({ status, size = "small" }: { status: string; size?: "small" | "medium" }) {
  const s = STYLES[status] ?? { label: status, bg: "#f5f5f4", fg: "#57534e" };
  return <Chip size={size} label={s.label} sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700 }} />;
}

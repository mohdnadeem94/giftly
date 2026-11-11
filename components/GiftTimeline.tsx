import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function fmt(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Paid -> Bought -> Delivered progress with dates. Server-safe (no client hooks). */
export default function GiftTimeline({
  status,
  paidAt,
  boughtAt,
  deliveredAt,
}: {
  status: string;
  paidAt: string;
  boughtAt: string | null;
  deliveredAt: string | null;
}) {
  const reached = status === "DELIVERED" ? 3 : status === "BOUGHT" ? 2 : 1;
  const steps = [
    { label: "Paid", icon: "💳", date: fmt(paidAt), note: "PayPal confirmed" },
    { label: "Bought", icon: "🛍️", date: fmt(boughtAt), note: "Charity bought it" },
    { label: "Delivered", icon: "🎁", date: fmt(deliveredAt), note: "A child has it" },
  ];

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", position: "relative", mt: 1 }} aria-label={`Gift status: ${status}`}>
      {/* connector */}
      <Box sx={{ position: "absolute", top: 19, left: "16.66%", right: "16.66%", height: 4, borderRadius: 999, bgcolor: "#ece6dc" }} />
      <Box
        sx={{
          position: "absolute",
          top: 19,
          left: "16.66%",
          width: reached === 1 ? "0%" : reached === 2 ? "33.33%" : "66.66%",
          height: 4,
          borderRadius: 999,
          bgcolor: "primary.main",
          transition: "width .4s",
        }}
      />
      {steps.map((s, i) => {
        const done = i < reached;
        const current = i === reached - 1;
        return (
          <Box key={s.label} sx={{ textAlign: "center", position: "relative" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                mx: "auto",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                bgcolor: done ? "#dcfce7" : "#f5f5f4",
                border: "3px solid",
                borderColor: done ? "primary.main" : "#e7e5e4",
                filter: done ? "none" : "grayscale(1)",
                opacity: done ? 1 : 0.6,
                boxShadow: current ? "0 0 0 5px rgba(22,101,52,0.12)" : "none",
              }}
            >
              {s.icon}
            </Box>
            <Typography sx={{ fontWeight: 800, mt: 0.75, fontSize: "0.9rem", color: done ? "text.primary" : "text.secondary" }}>
              {s.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
              {done ? (s.date ?? "Done") : "Waiting"}
            </Typography>
            {done && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1.3 }}>
                {s.note}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

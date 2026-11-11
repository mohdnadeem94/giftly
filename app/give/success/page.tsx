import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LinkButton from "@/components/ui/LinkButton";
import StatusChip from "@/components/ui/StatusChip";
import { db } from "@/lib/db";
import { money } from "@/lib/format";

const JOURNEY = ["PAID", "BOUGHT", "DELIVERED"] as const;

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  if (!ref) notFound();

  // Safe fields only: no PayPal order ID, no email.
  const order = await db.order.findUnique({
    where: { id: ref },
    select: {
      type: true,
      totalCents: true,
      status: true,
      charity: { select: { name: true, slug: true } },
      items: { select: { productTitle: true, status: true } },
    },
  });
  if (!order) notFound();

  const item = order.items[0];
  const stepIndex = item ? JOURNEY.indexOf(item.status as (typeof JOURNEY)[number]) : -1;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, sm: 5 }, textAlign: "center", boxShadow: "0 20px 50px rgba(28,25,23,0.08)" }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2.5,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            background: "linear-gradient(135deg, #166534, #22c55e)",
            boxShadow: "0 12px 30px rgba(22,101,52,0.35)",
          }}
        >
          <CheckRoundedIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Thank you!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          PayPal confirmed your {order.type === "CASH" ? "donation" : "gift"} of{" "}
          <Box component="strong" sx={{ color: "text.primary" }}>
            {money(order.totalCents)}
          </Box>{" "}
          to{" "}
          <Box component="strong" sx={{ color: "text.primary" }}>
            {order.charity.name}
          </Box>
          .
        </Typography>

        {item ? (
          <Box sx={{ textAlign: "left", bgcolor: "#faf7f2", borderRadius: "16px", p: 2.5, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 2 }}>
              <Typography sx={{ fontWeight: 800 }}>{item.productTitle}</Typography>
              <StatusChip status={item.status} />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {JOURNEY.map((s, i) => (
                <Box key={s} sx={{ textAlign: "center" }}>
                  <Box sx={{ height: 6, borderRadius: 999, bgcolor: i <= stepIndex ? "primary.main" : "#e7e5e4", mb: 0.75 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: i <= stepIndex ? "primary.main" : "text.secondary" }}>
                    {s === "PAID" ? "Paid" : s === "BOUGHT" ? "Bought" : "Delivered"}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Next, the charity buys it and uploads a receipt. Once the Elf checks it, the gift is marked Delivered.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mb: 3 }}>
            <StatusChip status={order.status} size="medium" />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
          <LinkButton href="/my-gifts" variant="contained">
            Track my gift
          </LinkButton>
          <LinkButton href="/causes" variant="outlined">
            Give again
          </LinkButton>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.secondary">
          PayPal sandbox payment. No real money moved.
        </Typography>
      </Paper>
    </Container>
  );
}

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ShoppingBagRoundedIcon from "@mui/icons-material/ShoppingBagRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import CharityGiftGrid from "@/components/CharityGiftGrid";
import { getActingCharity, getCharityGifts, getCharitySummary } from "@/lib/charity-data";
import { money } from "@/lib/format";

export default async function CharityDashboardPage() {
  const charity = await getActingCharity();

  if (!charity) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info">
          This is the charity dashboard. Switch the demo role to <strong>Charity</strong> (top right) to manage incoming gifts.
        </Alert>
      </Container>
    );
  }

  const [rows, summary] = await Promise.all([getCharityGifts(charity.id), getCharitySummary(charity.id)]);
  const toBuy = rows.filter((r) => r.status === "PAID");
  const toDeliver = rows.filter((r) => r.status === "BOUGHT");

  const tiles = [
    { icon: <ShoppingBagRoundedIcon />, label: "To buy", value: String(toBuy.length), sub: money(toBuy.reduce((s, r) => s + r.priceCents, 0)), color: "#92400e", bg: "#fef3c7" },
    { icon: <LocalShippingRoundedIcon />, label: "To deliver", value: String(toDeliver.length), sub: "bought, awaiting delivery", color: "#1e40af", bg: "#dbeafe" },
    { icon: <CardGiftcardRoundedIcon />, label: "Gifts received", value: money(rows.reduce((s, r) => s + r.priceCents, 0)), sub: `${rows.length} gifts`, color: "#be123c", bg: "#ffe4e6" },
    { icon: <VolunteerActivismRoundedIcon />, label: "Cash received", value: money(summary.cashCents), sub: `${summary.cashCount} donations`, color: "#166534", bg: "#dcfce7" },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="overline" color="secondary">
        Charity dashboard
      </Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: "1.9rem", md: "2.4rem" }, mb: 0.5 }}>
        {charity.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        Buy each gift from the store link, mark it Bought, then mark it Delivered once it reaches the person it&apos;s for. Donors follow every
        step. {charity.role === "admin" ? "(You're viewing as Admin.)" : ""}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {tiles.map((t) => (
          <Paper key={t.label} elevation={0} sx={{ p: 2.25, border: "1px solid", borderColor: "divider" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: "10px", display: "grid", placeItems: "center", bgcolor: t.bg, color: t.color }}>{t.icon}</Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t.label}
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", lineHeight: 1.1 }}>{t.value}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t.sub}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, border: "1px solid", borderColor: "divider" }}>
        <CharityGiftGrid key={charity.slug} initialRows={rows} charityName={charity.name} charitySlug={charity.slug} isAdmin={charity.role === "admin"} />
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Demo: purchases from stores are simulated (no real order is placed), and charity payouts are simulated.
      </Typography>
    </Container>
  );
}

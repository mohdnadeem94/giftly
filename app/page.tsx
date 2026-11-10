import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import CauseCard from "@/components/CauseCard";
import ElfChat from "@/components/ElfChat";
import LinkButton from "@/components/ui/LinkButton";
import { getPublicStats, listCauses } from "@/lib/public-data";
import { money } from "@/lib/format";

const STEPS = [
  {
    icon: <AutoAwesomeRoundedIcon />,
    title: "Ask the Elf",
    text: "Describe who you want to help. The Elf suggests a real gift with a live price, or cash where it does more good.",
  },
  {
    icon: <PaymentsRoundedIcon />,
    title: "Pay with PayPal",
    text: "Your payment is tied to the exact item you chose. The amount always comes from our records.",
  },
  {
    icon: <ReceiptLongRoundedIcon />,
    title: "Charity shows proof",
    text: "The charity buys the gift and uploads the receipt. The Elf checks it against your item and price.",
  },
  {
    icon: <LocalShippingRoundedIcon />,
    title: "Delivered",
    text: "You follow every step from Paid to Bought to Delivered, then get a thank-you note.",
  },
];

export default async function Home() {
  const [stats, causes] = await Promise.all([getPublicStats(), listCauses()]);

  const tiles = [
    { icon: <VolunteerActivismRoundedIcon />, label: "Total raised", value: money(stats.totalRaisedCents), color: "#166534" },
    { icon: <CardGiftcardRoundedIcon />, label: "Gifts delivered", value: `${stats.giftsDelivered}`, sub: `of ${stats.giftsGiven} given`, color: "#be123c" },
    { icon: <FavoriteRoundedIcon />, label: "Active causes", value: `${stats.activeCauses}`, color: "#d97706" },
    { icon: <GroupsRoundedIcon />, label: "Donors", value: `${stats.donors}`, color: "#2563eb" },
  ];

  return (
    <>
      {/* Hero */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          color: "#fff",
          background:
            "radial-gradient(1200px 400px at 85% -10%, rgba(253,164,175,0.35), transparent 60%), radial-gradient(800px 400px at 0% 110%, rgba(74,222,128,0.25), transparent 60%), linear-gradient(135deg, #0f3d22 0%, #166534 45%, #9f1239 100%)",
          pt: { xs: 7, md: 10 },
          pb: { xs: 14, md: 16 },
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
              gap: { xs: 5, md: 6 },
              alignItems: "center",
            }}
          >
            <Box>
              <Chip
                label="PayPal AI Hackathon 2026 · Sandbox demo"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", mb: 3 }}
              />
              <Typography
                variant="h1"
                sx={{ fontSize: { xs: "2.6rem", sm: "3.4rem", md: "4rem" }, lineHeight: 1.05, mb: 2.5 }}
              >
                Follow your gift
                <br />
                from click to child.
              </Typography>
              <Typography sx={{ fontSize: { xs: "1.1rem", md: "1.25rem" }, opacity: 0.9, maxWidth: 540, mb: 4 }}>
                Your money moves only when the gift arrives. Tell the Elf who you&apos;d like to help, and it finds a
                real gift, or the cause where cash does the most good.
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                <LinkButton
                  href="/causes"
                  size="large"
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ bgcolor: "#fff", color: "#14532d", "&:hover": { bgcolor: "#f0fdf4" } }}
                >
                  Explore causes
                </LinkButton>
                <LinkButton
                  href="/#how-it-works"
                  size="large"
                  variant="outlined"
                  sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#fff" } }}
                >
                  How it works
                </LinkButton>
              </Box>
            </Box>

            {/* The Elf: live AI chat */}
            <Box id="elf" sx={{ boxShadow: "0 30px 60px rgba(0,0,0,0.25)", borderRadius: "20px", scrollMarginTop: 96 }}>
              <ElfChat height={540} />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Stats */}
      <Container maxWidth="lg" sx={{ mt: { xs: -9, md: -10 }, position: "relative" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: { xs: 1.5, md: 2.5 },
          }}
        >
          {tiles.map((t) => (
            <Paper
              key={t.label}
              elevation={0}
              sx={{
                p: { xs: 2, md: 3 },
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 12px 32px rgba(28,25,23,0.08)",
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  color: t.color,
                  bgcolor: `${t.color}14`,
                  mb: 1.5,
                }}
              >
                {t.icon}
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "2rem" }, lineHeight: 1.1 }}>
                {t.value}
                {t.sub && (
                  <Typography component="span" color="text.secondary" sx={{ fontSize: "0.9rem", fontWeight: 600, ml: 0.75 }}>
                    {t.sub}
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                {t.label}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* How it works */}
      <Container maxWidth="lg" id="how-it-works" sx={{ mt: { xs: 8, md: 12 }, scrollMarginTop: 96 }}>
        <Typography variant="overline" color="secondary">
          How it works
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: "1.8rem", md: "2.4rem" }, mb: 4, maxWidth: 640 }}>
          Giving you can actually follow
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2.5 }}>
          {STEPS.map((s, i) => (
            <Paper key={s.title} elevation={0} sx={{ p: 3, border: "1px solid", borderColor: "divider", height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "14px",
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    background: "linear-gradient(135deg, #166534, #15803d)",
                  }}
                >
                  {s.icon}
                </Box>
                <Typography sx={{ fontWeight: 800, color: "#d6d3d1", fontSize: "1.6rem" }}>0{i + 1}</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {s.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {s.text}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* Causes */}
      <Container maxWidth="lg" sx={{ mt: { xs: 8, md: 12 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="overline" color="secondary">
              Causes
            </Typography>
            <Typography variant="h3" sx={{ fontSize: { xs: "1.8rem", md: "2.4rem" } }}>
              Who you can help this season
            </Typography>
          </Box>
          <LinkButton href="/causes" endIcon={<ArrowForwardRoundedIcon />}>
            See all causes
          </LinkButton>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
          {causes.map((c) => (
            <CauseCard key={c.slug} cause={c} />
          ))}
        </Box>
      </Container>
    </>
  );
}

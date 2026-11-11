import { notFound } from "next/navigation";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import ElfChat from "@/components/ElfChat";
import { ChartCaption, RaisedOverTimeChart } from "@/components/charts/GiftlyCharts";
import DonationsGrid from "@/components/grid/DonationsGrid";
import ProgressBar from "@/components/ProgressBar";
import LinkButton from "@/components/ui/LinkButton";
import StatusChip from "@/components/ui/StatusChip";
import { getCause } from "@/lib/public-data";
import { getChartData } from "@/lib/chart-data";
import { money } from "@/lib/format";

function parseFaq(text: string): { q: string; a: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^Q:\s*(.*?)\s*A:\s*(.*)$/);
      return m ? { q: m[1], a: m[2] } : { q: line, a: "" };
    });
}

export default async function CausePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [cause, charts] = await Promise.all([getCause(slug), getChartData(slug)]);
  if (!cause) notFound();

  const faq = parseFaq(cause.faqText);
  const journey = [
    { key: "PAID", label: "Paid", value: cause.giftStatus.PAID, color: "#92400e", bg: "#fef3c7" },
    { key: "BOUGHT", label: "Bought", value: cause.giftStatus.BOUGHT, color: "#1e40af", bg: "#dbeafe" },
    { key: "DELIVERED", label: "Delivered", value: cause.giftStatus.DELIVERED, color: "#166534", bg: "#dcfce7" },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <LinkButton href="/causes" startIcon={<ArrowBackRoundedIcon />} color="inherit" sx={{ color: "text.secondary", mb: 2 }}>
        All causes
      </LinkButton>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 380px" }, gap: { xs: 3, md: 4 }, alignItems: "start" }}>
        {/* Main column */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <Box
            component="img"
            src={cause.photoUrl}
            alt=""
            sx={{ width: "100%", aspectRatio: "16 / 8", objectFit: "cover", borderRadius: "24px", display: "block" }}
          />
          <Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
              <Chip label={cause.category} size="small" sx={{ bgcolor: "#f5f0e8" }} />
              {cause.verifiedDemo && (
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, height: 24, borderRadius: 999, bgcolor: "#dcfce7", color: "#166534", fontWeight: 600, fontSize: "0.8125rem" }}
                >
                  <VerifiedRoundedIcon sx={{ fontSize: 16 }} /> Verified (demo)
                </Box>
              )}
            </Box>
            <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 1 }}>
              {cause.name}
            </Typography>
            <Typography color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <PlaceOutlinedIcon fontSize="small" /> {cause.region}
            </Typography>
          </Box>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Their story
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.75 }}>
                {cause.story}
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Wishlist
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {cause.needs.map((n, i) => (
                  <Box key={n.id}>
                    {i > 0 && <Divider />}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          bgcolor: "#fff1f2",
                          color: "secondary.main",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <CardGiftcardRoundedIcon fontSize="small" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700 }}>{n.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ages {n.ageGroup}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 700 }}>{money(n.targetPriceCents)}</Typography>
                      <StatusChip status={n.status} />
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Box>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Questions
            </Typography>
            {faq.map((f, i) => (
              <Accordion
                key={i}
                disableGutters
                elevation={0}
                sx={{ border: "1px solid", borderColor: "divider", "&:before": { display: "none" }, mb: 1, borderRadius: "14px !important" }}
              >
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Typography sx={{ fontWeight: 700 }}>{f.q}</Typography>
                </AccordionSummary>
                {f.a && (
                  <AccordionDetails>
                    <Typography color="text.secondary">{f.a}</Typography>
                  </AccordionDetails>
                )}
              </Accordion>
            ))}
          </Box>

          <Card sx={{ overflow: "hidden" }}>
            <ElfChat
              charitySlug={cause.slug}
              height={460}
              greeting={`Hi! Ask me anything about ${cause.name}, or tell me who you'd like to help and I'll suggest a gift.`}
              suggestions={["How are gifts delivered?", "What does cash pay for?", "A gift for a 7-year-old under $25"]}
              placeholder="Ask about this cause…"
            />
          </Card>

          {charts && charts.raisedOverTime.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <ChartCaption cause={cause.slug} />
              <RaisedOverTimeChart data={charts} height={260} />
            </Box>
          )}

          <Card>
            <CardContent sx={{ p: 3, pb: "24px !important" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Recent donations
              </Typography>
              <DonationsGrid rows={cause.feed} />
            </CardContent>
          </Card>
        </Box>

        {/* Sticky give card */}
        <Box sx={{ position: { md: "sticky" }, top: { md: 96 } }}>
          <Card sx={{ boxShadow: "0 20px 50px rgba(28,25,23,0.10)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "2rem", lineHeight: 1.1 }}>{money(cause.raisedCents)}</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                raised of {money(cause.goalCents)} goal
              </Typography>
              <ProgressBar raisedCents={cause.raisedCents} goalCents={cause.goalCents} compact />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mt: 3 }}>
                <LinkButton
                  href={`/give/${cause.slug}?mode=gift`}
                  variant="contained"
                  size="large"
                  startIcon={<CardGiftcardRoundedIcon />}
                  fullWidth
                >
                  Give a gift
                </LinkButton>
                <LinkButton
                  href={`/give/${cause.slug}?mode=cash`}
                  variant="outlined"
                  size="large"
                  startIcon={<VolunteerActivismRoundedIcon />}
                  fullWidth
                >
                  Give cash
                </LinkButton>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="overline" color="text.secondary">
                Gift journey
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, mt: 1 }}>
                {journey.map((j) => (
                  <Box key={j.key} sx={{ bgcolor: j.bg, borderRadius: "14px", p: 1.5, textAlign: "center" }}>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: j.color, lineHeight: 1.1 }}>
                      {j.value}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: j.color }}>
                      {j.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 2.5 }}
              >
                <LockOutlinedIcon sx={{ fontSize: 14 }} /> Secure checkout with PayPal (sandbox)
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}

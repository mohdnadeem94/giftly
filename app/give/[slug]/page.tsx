import { notFound } from "next/navigation";
import { NeedStatus } from "@prisma/client";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import Checkout from "@/components/Checkout";
import LinkButton from "@/components/ui/LinkButton";
import { db } from "@/lib/db";

export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug } = await params;
  const { mode } = await searchParams;
  const charity = await db.charity.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      photoUrl: true,
      region: true,
      needs: {
        where: { status: { not: NeedStatus.FULFILLED } },
        orderBy: { targetPriceCents: "asc" },
        select: { id: true, title: true, ageGroup: true, targetPriceCents: true },
      },
    },
  });
  if (!charity) notFound();

  const isGift = mode !== "cash";

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
      <LinkButton
        href={`/causes/${charity.slug}`}
        startIcon={<ArrowBackRoundedIcon />}
        color="inherit"
        sx={{ color: "text.secondary", mb: 2 }}
      >
        Back to cause
      </LinkButton>

      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", overflow: "hidden", boxShadow: "0 20px 50px rgba(28,25,23,0.08)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 3, bgcolor: "#f5f0e8" }}>
          <Box
            component="img"
            src={charity.photoUrl}
            alt=""
            sx={{ width: 56, height: 56, borderRadius: "14px", objectFit: "cover", flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              You&apos;re giving to
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", lineHeight: 1.25 }}>{charity.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {charity.region}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
          {/* Mode switch */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0.5,
              p: 0.5,
              bgcolor: "#f5f0e8",
              borderRadius: 999,
              mb: 3,
            }}
          >
            <LinkButton
              href={`/give/${charity.slug}?mode=gift`}
              startIcon={<CardGiftcardRoundedIcon />}
              variant={isGift ? "contained" : "text"}
              color={isGift ? "primary" : "inherit"}
              sx={isGift ? undefined : { color: "text.secondary" }}
            >
              Give a gift
            </LinkButton>
            <LinkButton
              href={`/give/${charity.slug}?mode=cash`}
              startIcon={<VolunteerActivismRoundedIcon />}
              variant={!isGift ? "contained" : "text"}
              color={!isGift ? "primary" : "inherit"}
              sx={!isGift ? undefined : { color: "text.secondary" }}
            >
              Give cash
            </LinkButton>
          </Box>

          <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
            {isGift
              ? "Your payment is tied to this exact item. You can follow it from Paid to Bought to Delivered."
              : "Cash covers the charity's running costs, which is often where it does the most good."}
          </Typography>

          <Checkout
            key={isGift ? "gift" : "cash"}
            charity={{ slug: charity.slug, name: charity.name }}
            mode={isGift ? "gift" : "cash"}
            needs={charity.needs.map((n) => ({
              id: n.id,
              title: n.title,
              ageGroup: n.ageGroup,
              priceCents: n.targetPriceCents,
            }))}
            paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ""}
          />
        </Box>
      </Paper>
    </Container>
  );
}

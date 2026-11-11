import { notFound, redirect } from "next/navigation";
import { ItemStatus, NeedStatus, OrderStatus } from "@prisma/client";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import DemoExplainer from "@/components/DemoExplainer";
import Checkout, { type DraftGift } from "@/components/Checkout";
import GiftSearch from "@/components/GiftSearch";
import LinkButton from "@/components/ui/LinkButton";
import { db } from "@/lib/db";
import { canGive, signInHref } from "@/lib/roles";
import { getDemoSession } from "@/lib/session";

export default async function GivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; source?: string; item?: string }>;
}) {
  const { slug } = await params;
  const { mode, source, item } = await searchParams;

  // Giving needs the (simulated) sign-in. Come back to exactly this page afterwards.
  const { role } = await getDemoSession();
  if (!canGive(role)) {
    const qs = new URLSearchParams();
    if (mode) qs.set("mode", mode);
    if (source) qs.set("source", source);
    if (item) qs.set("item", item);
    redirect(signInHref(`/give/${encodeURIComponent(slug)}${qs.size ? `?${qs}` : ""}`));
  }
  const charity = await db.charity.findUnique({
    where: { slug },
    select: {
      id: true,
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
  const searchEnabled = !!process.env.CHANNEL3_API_KEY;

  // A product the donor picked from search (must still be an unpaid draft for this charity).
  let draft: DraftGift | null = null;
  let draftMissing = false;
  if (isGift && item) {
    const row = await db.orderItem.findFirst({
      where: {
        id: item,
        status: ItemStatus.PENDING,
        order: { charityId: charity.id, status: OrderStatus.PENDING },
      },
      select: { id: true, productTitle: true, merchant: true, imageUrl: true, productUrl: true, priceAtRecommendationCents: true },
    });
    if (row) {
      draft = {
        id: row.id,
        title: row.productTitle,
        merchant: row.merchant,
        imageUrl: row.imageUrl,
        productUrl: row.productUrl,
        priceCents: row.priceAtRecommendationCents,
      };
    } else {
      draftMissing = true;
    }
  }

  const view: "cash" | "draft" | "wishlist" | "search" = !isGift
    ? "cash"
    : draft
      ? "draft"
      : source === "wishlist" || !searchEnabled
        ? "wishlist"
        : "search";

  const needs = charity.needs.map((n) => ({
    id: n.id,
    title: n.title,
    ageGroup: n.ageGroup,
    priceCents: n.targetPriceCents,
  }));
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

  return (
    <Container maxWidth={view === "search" ? "md" : "sm"} sx={{ py: { xs: 3, md: 5 } }}>
      <LinkButton
        href={`/causes/${charity.slug}`}
        startIcon={<ArrowBackRoundedIcon />}
        color="inherit"
        sx={{ color: "text.secondary", mb: 2 }}
      >
        Back to cause
      </LinkButton>

      <Box sx={{ mb: 2.5 }}><DemoExplainer compact /></Box>

      <Paper
        elevation={0}
        sx={{ border: "1px solid", borderColor: "divider", overflow: "hidden", boxShadow: "0 20px 50px rgba(28,25,23,0.08)" }}
      >
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
          {/* Gift / cash switch */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0.5,
              p: 0.5,
              bgcolor: "#f5f0e8",
              borderRadius: 999,
              mb: 2.5,
              maxWidth: 520,
              mx: "auto",
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

          {/* Gift source: real products or the charity's own wishlist */}
          {isGift && view !== "draft" && searchEnabled && (
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mb: 2.5, flexWrap: "wrap" }}>
              <LinkButton
                href={`/give/${charity.slug}?mode=gift`}
                size="small"
                startIcon={<StorefrontRoundedIcon />}
                variant={view === "search" ? "outlined" : "text"}
                color={view === "search" ? "primary" : "inherit"}
                sx={view === "search" ? undefined : { color: "text.secondary" }}
              >
                Search real gifts
              </LinkButton>
              <LinkButton
                href={`/give/${charity.slug}?mode=gift&source=wishlist`}
                size="small"
                startIcon={<ChecklistRoundedIcon />}
                variant={view === "wishlist" ? "outlined" : "text"}
                color={view === "wishlist" ? "primary" : "inherit"}
                sx={view === "wishlist" ? undefined : { color: "text.secondary" }}
              >
                Charity&apos;s wishlist
              </LinkButton>
            </Box>
          )}

          {draftMissing && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              That gift was already paid for or has expired. Please pick a gift again.
            </Alert>
          )}

          {view === "search" ? (
            <>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2, textAlign: "center" }}>
                Describe who the gift is for. We search real stores for child-appropriate gifts with live prices.
              </Typography>
              <GiftSearch charitySlug={charity.slug} />
            </>
          ) : (
            <>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
                {isGift
                  ? "Your payment is tied to this exact item. You can follow it from Paid to Bought to Delivered."
                  : "Cash covers the charity's running costs, which is often where it does the most good."}
              </Typography>
              <Checkout
                key={view === "draft" ? `draft-${draft?.id}` : isGift ? "gift" : "cash"}
                charity={{ slug: charity.slug, name: charity.name }}
                mode={isGift ? "gift" : "cash"}
                needs={needs}
                draft={draft}
                paypalClientId={paypalClientId}
              />
            </>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

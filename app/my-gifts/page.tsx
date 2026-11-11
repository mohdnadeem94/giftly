import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import GiftTimeline from "@/components/GiftTimeline";
import DonorImpactCard from "@/components/DonorImpactCard";
import { ForgetDonorButton, ViewDemoDonorButton } from "@/components/DemoDonorButtons";
import AppLink from "@/components/ui/AppLink";
import LinkButton from "@/components/ui/LinkButton";
import StatusChip from "@/components/ui/StatusChip";
import { getCurrentDonor, getDonorGifts } from "@/lib/donor-data";
import { getDemoSession } from "@/lib/session";
import { money, shortDate } from "@/lib/format";
import { signInHref } from "@/lib/roles";

export default async function MyGiftsPage() {
  const [{ role, donorName }, donor] = await Promise.all([getDemoSession(), getCurrentDonor()]);
  if (role === "public") redirect(signInHref("/my-gifts")); // donors sign in (simulated) first

  if (!donor) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, sm: 5 }, textAlign: "center" }}>
          <Box sx={{ fontSize: 48, mb: 1 }} aria-hidden="true">
            🎁
          </Box>
          <Typography variant="h4" sx={{ mb: 1 }}>
            No gifts yet on this browser
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            After you give with PayPal, your gifts appear here, and you can follow each one from Paid to Bought to Delivered.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
            <LinkButton href="/causes" variant="contained" size="large">
              Find a gift to give
            </LinkButton>
            {role === "donor" && <ViewDemoDonorButton />}
          </Box>
        </Paper>
      </Container>
    );
  }

  const name = donorName ?? donor.displayName; // the sign-in name is used everywhere
  const gifts = await getDonorGifts(donor.id);
  const giftOrders = gifts.filter((g) => g.item && g.payment !== "RELEASED");
  const delivered = giftOrders.filter((g) => g.item?.status === "DELIVERED").length;
  const total = gifts.filter((g) => g.payment === "CHARGED").reduce((s, g) => s + g.totalCents, 0);
  const onHold = gifts.filter((g) => g.payment === "HELD").reduce((s, g) => s + g.totalCents, 0);
  const active = gifts.filter((g) => g.payment !== "RELEASED");
  const impact = {
    causesHelped: new Set(active.map((g) => g.charity.slug)).size,
    giftsGiven: giftOrders.length,
    delivered,
    givenCents: total,
    onHoldCents: onHold,
    // Price drops at Buy: PayPal held more than was finally charged (the rest was released).
    savedCents: gifts
      .filter((g) => g.payment === "CHARGED" && g.authorizedCents != null)
      .reduce((s, g) => s + Math.max(0, (g.authorizedCents ?? 0) - g.totalCents), 0),
    releasedCount: gifts.filter((g) => g.payment === "RELEASED").length,
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Box>
          <Typography variant="overline" color="secondary">
            My gifts
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: "1.9rem", md: "2.4rem" } }}>
            Thank you, {name}! 💚
          </Typography>
          <Typography color="text.secondary">Follow every gift from click to delivery.</Typography>
        </Box>
        <ForgetDonorButton />
      </Box>

      <DonorImpactCard impact={impact} name={name} />

      {gifts.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
          <Typography color="text.secondary">No completed gifts yet.</Typography>
        </Paper>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {gifts.map((g) =>
          g.item ? (
            <Card key={g.orderId}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 2 }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      flexShrink: 0,
                      borderRadius: "14px",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "#fff",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {g.item.imageUrl ? (
                      <Box component="img" src={g.item.imageUrl} alt="" referrerPolicy="no-referrer" sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.5 }} />
                    ) : (
                      <CardGiftcardRoundedIcon sx={{ color: "secondary.main" }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.3 }}>{g.item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      For{" "}
                      <AppLink href={`/causes/${g.charity.slug}`} underline="hover">
                        {g.charity.name}
                      </AppLink>{" "}
                      · {money(g.totalCents)} · {shortDate(g.paidAt)}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                      {g.payment === "RELEASED" ? (
                        <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: 999, bgcolor: "#f5f5f4", color: "#57534e", fontWeight: 800, fontSize: 13 }}>
                          Hold released
                        </Box>
                      ) : g.payment === "HELD" ? (
                        <Box component="span" sx={{ px: 1.25, py: 0.4, borderRadius: 999, bgcolor: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 13 }}>
                          🔒 On hold
                        </Box>
                      ) : (
                        <StatusChip status={g.item.status} />
                      )}
                      {g.item.receiptChecked && (
                        <Box
                          component="span"
                          sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontSize: 12.5, fontWeight: 700, color: "primary.main" }}
                        >
                          <VerifiedRoundedIcon sx={{ fontSize: 15 }} /> Receipt checked by the Elf
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {g.payment === "RELEASED" ? (
                  <Box sx={{ p: 2, borderRadius: "16px", bgcolor: "#f5f5f4" }}>
                    <Typography sx={{ fontWeight: 700 }}>Your payment hold was released. You were not charged.</Typography>
                    <Typography variant="body2" color="text.secondary">
                      The charity didn&apos;t buy this gift in time, so the PayPal hold was released and the money stayed with you.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {g.payment === "HELD" && !g.item.buyBlockedReason && (
                      <Box sx={{ mb: 2, p: 1.5, borderRadius: "14px", bgcolor: "#fffbeb", border: "1px solid #fde68a" }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          PayPal is holding {money(g.totalCents)}. You&apos;re charged only when {g.charity.name} buys this gift
                          {g.holdExpiresAt ? `, and the hold is released automatically on ${shortDate(g.holdExpiresAt)} if they don't` : ""}.
                        </Typography>
                      </Box>
                    )}
                    <GiftTimeline
                      status={g.item.status}
                      held={g.payment === "HELD"}
                      paidAt={g.paidAt}
                      boughtAt={g.item.boughtAt}
                      deliveredAt={g.item.deliveredAt}
                    />
                  </>
                )}

                {g.payment === "HELD" && g.item.buyBlockedReason && (
                  <Typography role="status" sx={{ color: "#92400e", mb: 2 }}>
                    {g.item.buyBlockedReason === "PRICE_UP" ? "The price changed" : "The item sold out"}, so you won&apos;t be charged. The hold will be released automatically.
                  </Typography>
                )}
                {g.payment === "CHARGED" && g.authorizedCents != null && g.totalCents < g.authorizedCents && (
                  <Typography sx={{ color: "primary.main", mb: 2 }}>
                    You paid {money(g.totalCents)} (less than the {money(g.authorizedCents)} held).
                  </Typography>
                )}
                {g.item.status === "DELIVERED" && (
                  <Box sx={{ mt: 2.5, p: 2, borderRadius: "16px", bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <Typography variant="overline" sx={{ color: "primary.main" }}>
                      💌 A note from {g.charity.name}
                    </Typography>
                    <Typography sx={{ lineHeight: 1.6 }}>
                      {g.thankYou ?? "Your gift was delivered! A thank-you note from the charity is on its way."}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card key={g.orderId}>
              <CardContent sx={{ p: { xs: 2, sm: 3 }, display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: "14px", display: "grid", placeItems: "center", bgcolor: "#dcfce7", fontSize: 22 }} aria-hidden="true">
                  💚
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>
                    {money(g.totalCents)} cash to {g.charity.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {shortDate(g.paidAt)} · Goes to the charity&apos;s running costs (payout simulated in this demo)
                  </Typography>
                </Box>
                <StatusChip status="RECEIVED" />
              </CardContent>
            </Card>
          )
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
        Your gifts are linked to this browser (demo, no account needed). Thank-you notes are written by the Elf from your gift details only.
      </Typography>
    </Container>
  );
}

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import GiftTimeline from "@/components/GiftTimeline";
import { ForgetDonorButton, ViewDemoDonorButton } from "@/components/DemoDonorButtons";
import AppLink from "@/components/ui/AppLink";
import LinkButton from "@/components/ui/LinkButton";
import StatusChip from "@/components/ui/StatusChip";
import { getCurrentDonor, getDonorGifts } from "@/lib/donor-data";
import { getDemoSession } from "@/lib/session";
import { money, shortDate } from "@/lib/format";

export default async function MyGiftsPage() {
  const [{ role }, donor] = await Promise.all([getDemoSession(), getCurrentDonor()]);

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

  const gifts = await getDonorGifts(donor.id);
  const giftOrders = gifts.filter((g) => g.item);
  const delivered = giftOrders.filter((g) => g.item?.status === "DELIVERED").length;
  const total = gifts.reduce((s, g) => s + g.totalCents, 0);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Box>
          <Typography variant="overline" color="secondary">
            My gifts
          </Typography>
          <Typography variant="h3" sx={{ fontSize: { xs: "1.9rem", md: "2.4rem" } }}>
            Thank you, {donor.displayName}! 💚
          </Typography>
          <Typography color="text.secondary">Follow every gift from click to delivery.</Typography>
        </Box>
        <ForgetDonorButton />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 3 }}>
        {[
          { label: "Gifts given", value: String(giftOrders.length) },
          { label: "Delivered", value: String(delivered) },
          { label: "Total given", value: money(total) },
        ].map((t) => (
          <Paper key={t.label} elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", color: "primary.main" }}>{t.value}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t.label}
            </Typography>
          </Paper>
        ))}
      </Box>

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
                      <StatusChip status={g.item.status} />
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

                <GiftTimeline status={g.item.status} paidAt={g.paidAt} boughtAt={g.item.boughtAt} deliveredAt={g.item.deliveredAt} />

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

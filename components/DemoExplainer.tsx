import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function DemoExplainer({ compact = false }: { compact?: boolean }) {
  return (
    <Paper component="aside" aria-label="About this demo" elevation={0}
      sx={{ p: { xs: 2, sm: 3 }, border: "1px solid #bbf7d0", bgcolor: "#f0fdf4" }}>
      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>A real workflow. A sandbox demo.</Typography>
      <Typography variant="body2" color="text.secondary">
        PayPal uses test funds only. Payment is captured at checkout, before delivery; no real money moves.
      </Typography>
      {!compact && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3, mt: 2.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>What you can try</Typography>
            <Typography variant="body2" color="text.secondary">
              Ask the AI Elf for gift ideas, browse products from real stores, and approve a sandbox payment.
              Switch to the charity view to mark a gift Bought and upload a receipt. Delivery requires
              accepted proof, then a thank-you is generated. AI checks can be reviewed by an admin.
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>What is simulated</Typography>
            <Typography variant="body2" color="text.secondary">
              Merchant purchases, charity payouts, and physical delivery are simulated. Charity verification
              badges are illustrative. The role switcher is a demo control, not a login. Charts include seeded
              demo records and sandbox donations, not real fundraising totals.
            </Typography>
          </Box>
        </Box>
      )}
      {compact && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Purchases, payouts, and delivery are simulated. Verification badges are illustrative; roles use a demo switcher.
      </Typography>}
    </Paper>
  );
}

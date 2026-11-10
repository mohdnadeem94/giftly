import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Logo from "./Logo";

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", mt: 8, py: 5, bgcolor: "#f5f0e8" }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ maxWidth: 360 }}>
            <Logo />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Santa&apos;s little agent for real giving. Follow your gift from click to child.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: 520 }}>
            <Typography variant="overline" color="text.secondary">
              What&apos;s real and what&apos;s simulated
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Payments run in the PayPal sandbox, so no real money moves. Charity payouts and merchant purchases are
              simulated, charity verification badges are illustrative, and roles are a demo switcher instead of a real
              login. Built for the PayPal AI Hackathon 2026.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

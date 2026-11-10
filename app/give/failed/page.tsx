import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import LinkButton from "@/components/ui/LinkButton";

export default async function FailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; cause?: string }>;
}) {
  const { reason, cause } = await searchParams;
  const safeReason = (reason ?? "").slice(0, 200);
  const backHref = cause && /^[a-z0-9-]+$/.test(cause) ? `/give/${cause}` : "/causes";

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, sm: 5 }, textAlign: "center" }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 2.5,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "#9f1239",
            bgcolor: "#ffe4e6",
          }}
        >
          <PriorityHighRoundedIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Payment not completed
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {safeReason || "PayPal did not confirm the payment."}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No donation was recorded.
        </Typography>
        <LinkButton href={backHref} variant="contained" size="large">
          Try again
        </LinkButton>
      </Paper>
    </Container>
  );
}

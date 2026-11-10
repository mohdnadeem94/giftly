import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LinkButton from "@/components/ui/LinkButton";

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, sm: 5 }, textAlign: "center" }}>
        <Box sx={{ fontSize: 48, mb: 1 }} aria-hidden="true">
          🎁
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          This page isn&apos;t on the list
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The page you&apos;re looking for doesn&apos;t exist, or it has moved.
        </Typography>
        <LinkButton href="/causes" variant="contained" size="large">
          Explore causes
        </LinkButton>
      </Paper>
    </Container>
  );
}

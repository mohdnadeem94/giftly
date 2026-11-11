import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CauseCard from "@/components/CauseCard";
import { listCauses } from "@/lib/public-data";

export default async function CausesPage() {
  const causes = await listCauses();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Typography variant="overline" color="secondary">
        Explore causes
      </Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 1 }}>
        Causes that need your help
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 620, mb: 4 }}>
        Give cash for running costs, or a real gift you can follow all the way to delivery.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
        {causes.map((c) => (
          <CauseCard key={c.slug} cause={c} />
        ))}
      </Box>
    </Container>
  );
}

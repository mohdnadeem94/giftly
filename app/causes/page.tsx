import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CausesExplorer from "@/components/CausesExplorer";
import { listCauses } from "@/lib/public-data";
import { getChartData } from "@/lib/chart-data";

export default async function CausesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [causes, charts] = await Promise.all([listCauses(), getChartData()]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Typography variant="overline" color="secondary">
        Explore causes
      </Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 1 }}>
        Causes that need your help
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 620, mb: 4 }}>
        Give cash for running costs, or a real gift you can follow all the way to delivery. Click a chart slice to
        filter the list.
      </Typography>
      {charts && <CausesExplorer causes={causes} data={charts} initialCategory={category ?? null} />}
    </Container>
  );
}

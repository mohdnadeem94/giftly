import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CausesExplorer from "@/components/CausesExplorer";
import LinkButton from "@/components/ui/LinkButton";
import { listCauses } from "@/lib/public-data";
import { getChartData } from "@/lib/chart-data";
import { getDonorGivingBySlug, getViewer } from "@/lib/viewer";
import { money } from "@/lib/format";
import { signInHref } from "@/lib/roles";

export default async function CausesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [causes, charts, viewer] = await Promise.all([listCauses(), getChartData(), getViewer()]);
  const myGiving = viewer.mode === "donor" && viewer.donorId ? await getDonorGivingBySlug(viewer.donorId) : null;
  const supported = myGiving ? Object.keys(myGiving).length : 0;
  const myTotal = myGiving ? Object.values(myGiving).reduce((s, c) => s + c, 0) : 0;

  const heading =
    viewer.mode === "charity"
      ? { over: "Charity view", title: "Causes on Giftly", text: `You're viewing as ${viewer.ownCharity?.name ?? "a charity"}. Your cause is highlighted; manage its gifts from your dashboard. Charities can't donate from this view.` }
      : viewer.mode === "donor"
        ? {
            over: viewer.donorName ? `Welcome back, ${viewer.donorName}` : "Donor view",
            title: "Causes that need your help",
            text: supported
              ? `You've supported ${supported} cause${supported === 1 ? "" : "s"} with ${money(myTotal)} so far. Pick one to give again, or ask the Elf for ideas.`
              : "Give cash for running costs, or a real gift you can follow all the way to delivery. Click a chart slice to filter the list.",
          }
        : { over: "Explore causes", title: "Causes that need your help", text: "Give cash for running costs, or a real gift you can follow all the way to delivery. Click a chart slice to filter the list." };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Typography variant="overline" color="secondary">
        {heading.over}
      </Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, mb: 1 }}>
        {heading.title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 640, mb: viewer.mode === "donor" ? 4 : 2.5 }}>
        {heading.text}
      </Typography>

      {viewer.mode === "public" && (
        <Alert
          severity="info"
          sx={{ mb: 3, borderRadius: "14px", maxWidth: 720 }}
          action={
            <LinkButton href={signInHref("/causes")} size="small" variant="contained">
              Sign in
            </LinkButton>
          }
        >
          Browsing as a visitor. Sign in (simulated) to give and to chat with the Elf.
        </Alert>
      )}
      {viewer.mode === "charity" && viewer.ownCharity && (
        <Alert
          severity="success"
          sx={{ mb: 3, borderRadius: "14px", maxWidth: 720 }}
          action={
            <LinkButton href="/charity" size="small" variant="contained">
              Dashboard
            </LinkButton>
          }
        >
          {viewer.ownCharity.name} is your charity. Open the dashboard to buy held gifts and upload receipts.
        </Alert>
      )}

      {charts && (
        <CausesExplorer
          causes={causes}
          data={charts}
          initialCategory={category ?? null}
          viewer={{ mode: viewer.mode, ownSlug: viewer.ownCharity?.slug ?? null }}
          myGiving={myGiving}
        />
      )}
    </Container>
  );
}

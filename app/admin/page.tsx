import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import AdminConsole from "@/components/admin/AdminConsole";
import { getAdminData } from "@/lib/admin-data";
import { getDemoSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { role } = await getDemoSession();
  if (role !== "admin") {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="info" sx={{ borderRadius: "14px" }}>
          This is the platform admin console. Switch the demo role to <strong>Admin</strong> (top right) to open it.
        </Alert>
      </Container>
    );
  }

  const data = await getAdminData();
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="overline" color="secondary">
        Admin console
      </Typography>
      <Typography variant="h3" sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, mb: 1 }}>
        Platform overview
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 680, mb: 4 }}>
        Everything across all charities in one place: settle disputed receipts, watch payment holds, check on each charity, and
        prepare the demo.
      </Typography>
      <AdminConsole {...data} />
    </Container>
  );
}

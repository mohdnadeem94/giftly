import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import ElfTestRunner from "@/components/ElfTestRunner";
import { getDemoSession } from "@/lib/session";

// Admin-only page to try the Elf against 10 tricky requests.
export default async function ElfTestPage() {
  const { role } = await getDemoSession();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Typography variant="overline" color="secondary">
        Admin
      </Typography>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Elf test bench
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ten tricky requests to check the Elf&apos;s recommendations and guardrails. Every turn is also logged in the
        AgentLog table.
      </Typography>
      {role === "admin" ? (
        <ElfTestRunner />
      ) : (
        <Alert severity="info">Switch the demo role to Admin (top right) to use the test bench.</Alert>
      )}
    </Container>
  );
}

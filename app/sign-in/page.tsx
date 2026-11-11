import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import DemoSignIn from "@/components/DemoSignIn";
import { canGive, safeNext } from "@/lib/roles";
import { getDemoSession } from "@/lib/session";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; ask?: string }> }) {
  const { next: rawNext, ask: rawAsk } = await searchParams;
  const next = safeNext(rawNext);
  const ask = typeof rawAsk === "string" ? rawAsk.slice(0, 600) : "";
  const { role, donorName } = await getDemoSession();

  // Already signed in as a donor: continue straight away.
  if (canGive(role)) redirect(ask ? `${next}${next.includes("?") ? "&" : "?"}ask=${encodeURIComponent(ask)}` : next);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <DemoSignIn next={next} ask={ask} defaultName={donorName ?? ""} />
    </Container>
  );
}

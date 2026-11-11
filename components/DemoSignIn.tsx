"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ElfLoader from "@/components/ElfLoader";
import Logo from "@/components/Logo";
import { demoSignIn, demoSignInAsCharity } from "@/app/sign-in/actions";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Simulated sign-in: no accounts, no passwords. It only switches this browser to the Donor demo role. */
export default function DemoSignIn({ next, ask, defaultName }: { next: string; ask: string; defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName || "Nadeem");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [pending, start] = useTransition();
  const busy = signingIn || pending;

  const purpose = ask
    ? `After you sign in, the Elf will answer: “${ask.length > 80 ? `${ask.slice(0, 80)}…` : ask}”`
    : next.startsWith("/give/")
      ? "After you sign in, you'll go straight back to giving."
      : "Sign in to give gifts, chat with the Elf and track your gifts.";

  async function signIn() {
    setError("");
    setSigningIn(true);
    await wait(1200); // a short pause so the simulated sign-in is visible in the demo
    const res = await demoSignIn({ name, next, ask });
    if (!res.ok) {
      setSigningIn(false);
      setError(res.error);
      return;
    }
    start(() => {
      router.push(res.to);
      router.refresh();
    });
  }

  async function asCharity() {
    setSigningIn(true);
    await wait(800);
    const res = await demoSignInAsCharity();
    start(() => {
      router.push(res.to);
      router.refresh();
    });
  }

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, border: "1px solid", borderColor: "divider", boxShadow: "0 24px 60px rgba(28,25,23,0.08)" }}>
      {busy ? (
        <ElfLoader messages={["Checking your details (simulated)…", "Signing you in…", "Getting your giving page ready…"]} />
      ) : (
        <>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Logo />
          </Box>
          <Typography variant="h4" sx={{ textAlign: "center", fontSize: { xs: "1.6rem", sm: "1.9rem" }, mb: 0.5 }}>
            Sign in to give
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
            {purpose}
          </Typography>

          <Alert icon={<ScienceOutlinedIcon />} severity="info" sx={{ mb: 3, borderRadius: "14px" }}>
            <strong>Simulated sign-in.</strong> This is a hackathon demo: no account is created and no password is needed. It just
            switches this browser to the Donor view.
          </Alert>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn();
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 40 } }}
              helperText="Shown with your donations unless you choose Anonymous at checkout."
              autoFocus
              fullWidth
            />
            <TextField label="Email" value="demo-donor@example.com" disabled helperText="Simulated. Not collected." fullWidth />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" fullWidth>
              Sign in (simulated)
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>or</Divider>
          <Button onClick={() => void asCharity()} variant="outlined" color="inherit" fullWidth sx={{ borderColor: "divider" }}>
            I&apos;m a charity: open the charity dashboard
          </Button>
        </>
      )}
    </Paper>
  );
}

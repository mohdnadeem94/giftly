"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { forgetDonor, viewAsDemoDonor } from "@/app/my-gifts/actions";

export function ViewDemoDonorButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <Box>
      <Button
        variant="outlined"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await viewAsDemoDonor();
            if (!res.ok) setError(res.error ?? "Could not load the demo donor.");
            else router.refresh();
          })
        }
      >
        {pending ? "Loading…" : "View a demo donor's gifts"}
      </Button>
      {error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export function ForgetDonorButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="small"
      color="inherit"
      sx={{ color: "text.secondary" }}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await forgetDonor();
          router.refresh();
        })
      }
    >
      Not you? Forget this browser
    </Button>
  );
}

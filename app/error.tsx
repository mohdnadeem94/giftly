"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", p: { xs: 3, sm: 5 }, textAlign: "center" }}>
        <Box sx={{ fontSize: 48, mb: 1 }} aria-hidden="true">
          🧝
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          The Elf tripped over a ribbon
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          We couldn&apos;t load this page. The database may still be waking up, so please try again in a moment.
        </Typography>
        <Button variant="contained" size="large" startIcon={<RefreshRoundedIcon />} onClick={() => reset()}>
          Try again
        </Button>
      </Paper>
    </Container>
  );
}

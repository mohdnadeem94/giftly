"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import LinkButton from "@/components/ui/LinkButton";
import { money } from "@/lib/format";

export type Impact = {
  causesHelped: number;
  giftsGiven: number;
  delivered: number;
  givenCents: number; // actually charged
  onHoldCents: number;
  savedCents: number; // price drops at Buy: held more than was finally charged
  releasedCount: number; // holds released, never charged
};

/** "Your impact" summary on My gifts, with a share line the donor can copy. */
export default function DonorImpactCard({ impact, name }: { impact: Impact; name: string }) {
  const [copied, setCopied] = useState(false);
  const { causesHelped, giftsGiven, delivered, givenCents, onHoldCents, savedCents, releasedCount } = impact;

  const headline =
    delivered > 0
      ? `${delivered} gift${delivered === 1 ? " has" : "s have"} already reached someone in need.`
      : giftsGiven > 0
        ? "Your gifts are on their way. You'll see each one arrive."
        : "Your giving is helping real causes.";

  const deliveredPart =
    delivered === 0
      ? ""
      : delivered === giftsGiven
        ? giftsGiven === 1
          ? ", and it's already been delivered"
          : giftsGiven === 2
            ? ", and both have already been delivered"
            : ", and all of them have already been delivered"
        : `, and ${delivered} ${delivered === 1 ? "has" : "have"} already been delivered`;
  const shareText = `I've given ${
    giftsGiven ? `${giftsGiven} real gift${giftsGiven === 1 ? "" : "s"}` : "to causes I care about"
  } through Giftly${deliveredPart}! With Giftly, you're only charged when the charity buys your gift, and you can watch it arrive. 🎁`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const stats = [
    { value: String(causesHelped), label: causesHelped === 1 ? "cause helped" : "causes helped" },
    { value: String(giftsGiven), label: giftsGiven === 1 ? "gift given" : "gifts given" },
    { value: String(delivered), label: "delivered" },
    { value: money(givenCents), label: onHoldCents ? `given · ${money(onHoldCents)} on hold` : "given" },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, sm: 3 },
        mb: 3,
        borderRadius: "20px",
        color: "#fff",
        background: "linear-gradient(135deg, #14532d 0%, #166534 55%, #9f1239 130%)",
        boxShadow: "0 18px 40px rgba(20,83,45,0.25)",
      }}
    >
      <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1.2 }}>
        Your impact, {name}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.3rem", sm: "1.55rem" }, lineHeight: 1.25, mb: 2 }}>{headline}</Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 1.25, mb: 2 }}>
        {stats.map((s) => (
          <Box key={s.label} sx={{ p: 1.5, borderRadius: "14px", bgcolor: "rgba(255,255,255,0.12)", textAlign: "center" }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", lineHeight: 1.2 }}>{s.value}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {(savedCents > 0 || releasedCount > 0) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          {savedCents > 0 && (
            <Box sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.18)", fontSize: 13, fontWeight: 700 }}>
              💸 {money(savedCents)} saved by price drops
            </Box>
          )}
          {releasedCount > 0 && (
            <Box sx={{ px: 1.25, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.18)", fontSize: 13, fontWeight: 700 }}>
              🔓 {releasedCount} hold{releasedCount === 1 ? "" : "s"} released, never charged
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          onClick={copy}
          variant="contained"
          startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
          sx={{ bgcolor: "#fff", color: "#14532d", "&:hover": { bgcolor: "#f0fdf4" } }}
        >
          {copied ? "Copied! Share it anywhere" : "Copy share message"}
        </Button>
        <LinkButton href="/causes" variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)", "&:hover": { borderColor: "#fff" } }}>
          Give again
        </LinkButton>
      </Box>
    </Paper>
  );
}

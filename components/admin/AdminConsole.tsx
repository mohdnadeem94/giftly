"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import LockClockRoundedIcon from "@mui/icons-material/LockClockRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import type { AdminOverview, CharityRow, HeldGift, ReviewItem } from "@/lib/admin-data";
import { adminOpenCharity, adminReleaseHold, adminResetDemo, adminReviewReceipt } from "@/app/admin/actions";
import { money } from "@/lib/format";

type Props = { overview: AdminOverview; queue: ReviewItem[]; heldGifts: HeldGift[]; charities: CharityRow[] };

function timeLeft(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired: releasing";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h}h left` : `${Math.max(1, Math.ceil(ms / 60_000))}m left`;
}

const VERDICT: Record<string, { label: string; color: "error" | "warning" | "default" }> = {
  MISMATCH: { label: "AI: mismatch", color: "error" },
  UNCLEAR: { label: "AI: unclear", color: "warning" },
};

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#f0fdf4", color: "primary.main", display: "grid", placeItems: "center" }}>{icon}</Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>
      {children}
    </Paper>
  );
}

export default function AdminConsole({ overview, queue, heldGifts, charities }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const [toast, setToast] = useState<{ severity: "success" | "error" | "info"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  async function run(key: string, fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, after?: () => void) {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    setArmed(null);
    if (!res.ok) return setToast({ severity: "error", text: res.error });
    if (res.message) setToast({ severity: "success", text: res.message });
    after?.();
    startTransition(() => router.refresh());
  }

  const tiles = [
    { label: "Raised (charged)", value: money(overview.raisedCents) },
    { label: "On hold", value: money(overview.heldCents), sub: `${overview.heldCount} gift${overview.heldCount === 1 ? "" : "s"}` },
    { label: "Gifts to buy", value: String(overview.toBuy) },
    { label: "Awaiting delivery", value: String(overview.toDeliver) },
    { label: "Delivered", value: String(overview.delivered) },
    { label: "Receipts to review", value: String(overview.receiptsToReview), alert: overview.receiptsToReview > 0 },
    { label: "Holds released", value: String(overview.releasedHolds), sub: "donor never charged" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Overview */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)", lg: "repeat(7, 1fr)" }, gap: 1.5 }}>
        {tiles.map((t) => (
          <Paper
            key={t.label}
            elevation={0}
            sx={{ p: 2, border: "1px solid", borderColor: t.alert ? "#fca5a5" : "divider", bgcolor: t.alert ? "#fef2f2" : "background.paper" }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t.label}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.35rem" }}>{t.value}</Typography>
            {t.sub && (
              <Typography variant="caption" color="text.secondary">
                {t.sub}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>

      {/* Receipts to review */}
      <Section
        icon={<GavelRoundedIcon />}
        title="Receipts to review"
        subtitle="Receipts the AI couldn't confirm, from every charity. Approve lets the charity mark the gift Delivered; Reject asks for a correct receipt."
      >
        {queue.length === 0 ? (
          <Alert severity="success" sx={{ borderRadius: "12px" }}>
            Nothing to review. Every uploaded receipt matched or was already decided.
          </Alert>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            {queue.map((r) => (
              <Paper key={r.proofId} elevation={0} sx={{ p: 2, border: "1px solid", borderColor: "divider", display: "flex", gap: 2 }}>
                <Box
                  component="a"
                  href={`/api/proofs/${r.proofId}/image`}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ flexShrink: 0, width: 96, height: 120, borderRadius: "10px", overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "#fafaf9" }}
                  title="Open the full receipt"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/proofs/${r.proofId}/image`} alt="Uploaded receipt" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.productTitle}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.charityName} · {money(r.priceCents)} · {r.merchant}
                  </Typography>
                  <Chip size="small" sx={{ mt: 0.75 }} label={VERDICT[r.aiResult ?? ""]?.label ?? "AI: no verdict"} color={VERDICT[r.aiResult ?? ""]?.color ?? "default"} />
                  {r.aiNotes && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                      {r.aiNotes.slice(0, 160)}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", gap: 1, mt: 1.25 }}>
                    <Button size="small" variant="contained" disabled={!!busy} onClick={() => run(r.proofId, () => adminReviewReceipt(r.proofId, "APPROVED"))}>
                      Approve
                    </Button>
                    <Button size="small" variant="outlined" color="error" disabled={!!busy} onClick={() => run(r.proofId, () => adminReviewReceipt(r.proofId, "REJECTED"))}>
                      Reject
                    </Button>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Section>

      {/* Holds */}
      <Section
        icon={<LockClockRoundedIcon />}
        title="Payment holds"
        subtitle="Every gift payment PayPal is holding, across all charities. Holds are released automatically after 72 hours; you can release a stuck one now."
      >
        {heldGifts.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: "12px" }}>
            No payments on hold right now.
          </Alert>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Gift</TableCell>
                  <TableCell>Charity</TableCell>
                  <TableCell align="right">Held</TableCell>
                  <TableCell>Time left</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {heldGifts.map((h) => (
                  <TableRow key={h.orderId}>
                    <TableCell sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700 }}>{h.productTitle}</TableCell>
                    <TableCell>{h.charityName}</TableCell>
                    <TableCell align="right">{money(h.cents)}</TableCell>
                    <TableCell>{timeLeft(h.expiresAt)}</TableCell>
                    <TableCell>
                      {h.blocked ? (
                        <Chip size="small" color="warning" label={h.blocked === "PRICE_UP" ? "Price went up" : "Sold out"} />
                      ) : (
                        <Chip size="small" label="Waiting for charity" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color={armed === h.orderId ? "error" : "inherit"}
                        disabled={!!busy}
                        onClick={() => (armed === h.orderId ? run(h.orderId, () => adminReleaseHold(h.orderId)) : setArmed(h.orderId))}
                      >
                        {armed === h.orderId ? "Confirm release" : "Release"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Section>

      {/* Charities */}
      <Section icon={<ApartmentRoundedIcon />} title="Charities" subtitle="How each charity is doing. Open any dashboard to see it exactly as the charity does.">
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Charity</TableCell>
                <TableCell align="right">Raised</TableCell>
                <TableCell align="right">Goal</TableCell>
                <TableCell align="right">On hold</TableCell>
                <TableCell align="right">To buy</TableCell>
                <TableCell align="right">To deliver</TableCell>
                <TableCell align="right">Delivered</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {charities.map((c) => (
                <TableRow key={c.slug}>
                  <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                  <TableCell align="right">{money(c.raisedCents)}</TableCell>
                  <TableCell align="right">{money(c.goalCents)}</TableCell>
                  <TableCell align="right">{c.held}</TableCell>
                  <TableCell align="right">{c.toBuy}</TableCell>
                  <TableCell align="right">{c.toDeliver}</TableCell>
                  <TableCell align="right">{c.delivered}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={!!busy}
                      onClick={() => run(`c-${c.slug}`, () => adminOpenCharity(c.slug), () => router.push("/charity"))}
                    >
                      Open dashboard
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Section>

      {/* Demo tools */}
      <Section icon={<BuildRoundedIcon />} title="Demo tools" subtitle="For preparing the hackathon demo. Reset releases every PayPal hold first, then reloads the demo data.">
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            size="small"
            type="password"
            label="Admin passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoComplete="off"
            sx={{ minWidth: 220 }}
          />
          <Button
            variant={armed === "reset" ? "contained" : "outlined"}
            color="error"
            disabled={!!busy || !passcode}
            onClick={() =>
              armed === "reset" ? run("reset", () => adminResetDemo(passcode), () => setPasscode("")) : setArmed("reset")
            }
          >
            {busy === "reset" ? "Resetting…" : armed === "reset" ? "Confirm: wipe and reload demo data" : "Reset demo data"}
          </Button>
          <Button component={NextLink} href="/elf-test" variant="text">
            Open Elf tests
          </Button>
        </Box>
      </Section>

      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import ThumbDownRoundedIcon from "@mui/icons-material/ThumbDownRounded";
import ThumbUpRoundedIcon from "@mui/icons-material/ThumbUpRounded";
import { reviewProof, updateGiftStatus } from "@/app/charity/actions";
import type { CharityGiftRow } from "@/lib/charity-data";

const VERDICT: Record<string, { label: string; severity: "success" | "error" | "warning" | "info"; text: string }> = {
  MATCH: { label: "Match", severity: "success", text: "The AI says this receipt matches the gift." },
  MISMATCH: { label: "Mismatch", severity: "error", text: "The AI says this receipt doesn't match the gift. An admin must approve it, or upload the right receipt." },
  UNCLEAR: { label: "Unclear", severity: "warning", text: "The AI couldn't confirm this receipt. An admin must approve it, or upload a clearer image." },
  APPROVED: { label: "Approved by admin", severity: "success", text: "An admin approved this receipt." },
  REJECTED: { label: "Rejected by admin", severity: "error", text: "An admin rejected this receipt. Please upload the correct one." },
  UPLOADED: { label: "Uploaded", severity: "info", text: "Receipt uploaded." },
};

type Props = {
  row: CharityGiftRow | null;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (row: CharityGiftRow, message: string) => void;
};

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ProofDialog({ row, isAdmin, onClose, onUpdated }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<CharityGiftRow | null>(row);
  const [busy, setBusy] = useState<"" | "upload" | "deliver" | "review">("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(row);
    setError("");
    setPreview(null);
    setBusy("");
  }, [row]);

  if (!current) return null;
  const verdict = current.proof ? VERDICT[current.proof] ?? VERDICT.UPLOADED : null;

  async function upload(file: File) {
    if (!current) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Please choose an image under 2 MB.");
      return;
    }
    setError("");
    setPreview(URL.createObjectURL(file));
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.append("itemId", current.id);
      fd.append("file", file);
      const res = await fetch("/api/proofs", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      if (data.row) {
        setCurrent(data.row);
        onUpdated(data.row, `Receipt checked: ${VERDICT[data.row.proof]?.label ?? "uploaded"}.`);
      }
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function deliver() {
    if (!current) return;
    setBusy("deliver");
    setError("");
    const res = await updateGiftStatus([current.id], "DELIVERED");
    setBusy("");
    if (!res.ok) return setError(res.error);
    if (res.rows[0]) {
      onUpdated(res.rows[0], `“${current.productTitle.slice(0, 40)}” marked Delivered.`);
      onClose();
    }
  }

  async function review(decision: "APPROVED" | "REJECTED") {
    if (!current) return;
    setBusy("review");
    setError("");
    const res = await reviewProof(current.id, decision);
    setBusy("");
    if (!res.ok) return setError(res.error);
    if (res.rows[0]) {
      setCurrent(res.rows[0]);
      onUpdated(res.rows[0], decision === "APPROVED" ? "Receipt approved." : "Receipt rejected.");
    }
  }

  const needsReview = current.proof === "MISMATCH" || current.proof === "UNCLEAR";

  return (
    <Dialog open={!!row} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Receipt &amp; delivery</DialogTitle>
      <DialogContent dividers>
        {/* Expected gift */}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: "10px", border: "1px solid #ece6dc", overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0, bgcolor: "#fff" }}>
            {current.imageUrl ? <img src={current.imageUrl} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : "🎁"}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{current.productTitle}</Typography>
            <Typography variant="body2" color="text.secondary">
              Expected: {money(current.priceCents)} from {current.merchant}
            </Typography>
          </Box>
        </Box>

        {current.status === "PAID" && <Alert severity="info">Mark this gift as Bought first, then upload its receipt here.</Alert>}

        {current.status === "DELIVERED" && (
          <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
            This gift has been delivered. 🎉
          </Alert>
        )}

        {current.status !== "PAID" && (
          <>
            {verdict && (
              <Alert severity={verdict.severity} sx={{ mb: 2 }}>
                <strong>{verdict.label}.</strong> {verdict.text}
                {current.proofNotes && (
                  <Box component="span" sx={{ display: "block", mt: 0.5, fontSize: "0.85rem", opacity: 0.85 }}>
                    AI note: {current.proofNotes}
                  </Box>
                )}
              </Alert>
            )}

            {(preview || current.proofId) && (
              <Box sx={{ mb: 2, border: "1px solid #ece6dc", borderRadius: "12px", overflow: "hidden", bgcolor: "#faf7f2", textAlign: "center" }}>
                <img
                  src={preview ?? `/api/proofs/${current.proofId}/image`}
                  alt="Uploaded receipt"
                  style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", display: "block", margin: "0 auto" }}
                />
              </Box>
            )}

            {busy === "upload" && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }} role="status">
                <CircularProgress size={20} />
                <Typography variant="body2">The Elf is checking the receipt against the gift…</Typography>
              </Box>
            )}

            {current.status === "BOUGHT" && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant={current.proofId ? "outlined" : "contained"}
                  startIcon={<CloudUploadRoundedIcon />}
                  onClick={() => fileRef.current?.click()}
                  disabled={!!busy}
                  fullWidth
                >
                  {current.proofId ? "Upload a different receipt" : "Upload receipt"}
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                  Receipts only (JPG, PNG or WebP, under 2 MB). Please don&apos;t upload photos of people or personal details.
                </Typography>
              </>
            )}

            {isAdmin && current.proofId && current.status === "BOUGHT" && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" color="text.secondary">
                  Admin review {needsReview ? "(needed)" : ""}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Button color="success" variant="outlined" startIcon={<ThumbUpRoundedIcon />} disabled={!!busy} onClick={() => review("APPROVED")}>
                    Approve
                  </Button>
                  <Button color="error" variant="outlined" startIcon={<ThumbDownRoundedIcon />} disabled={!!busy} onClick={() => review("REJECTED")}>
                    Reject
                  </Button>
                </Box>
              </>
            )}
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={!!busy} color="inherit">
          Close
        </Button>
        {current.status === "BOUGHT" && (
          <Button
            variant="contained"
            startIcon={busy === "deliver" ? <CircularProgress size={16} color="inherit" /> : <LocalShippingRoundedIcon />}
            disabled={!current.canDeliver || !!busy}
            onClick={deliver}
          >
            Mark Delivered
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PayPalOneTimePaymentButton,
  PayPalProvider,
  type OnApproveDataOneTimePayments,
} from "@paypal/react-paypal-js/sdk-v6";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import CardGiftcardRoundedIcon from "@mui/icons-material/CardGiftcardRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { finishCheckout, startCheckout, type StartInput } from "@/app/give/actions";
import ElfLoader, { PAYMENT_MESSAGES } from "@/components/ElfLoader";

type Need = { id: string; title: string; ageGroup: string; priceCents: number };

type Props = {
  charity: { slug: string; name: string };
  mode: "cash" | "gift";
  needs: Need[];
  paypalClientId: string;
};

const PRESETS = [1000, 2500, 5000, 10000];

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function Checkout({ charity, mode, needs, paypalClientId }: Props) {
  const router = useRouter();
  const [cashCents, setCashCents] = useState(2500);
  const [customAmount, setCustomAmount] = useState("");
  const [needId, setNeedId] = useState(needs[0]?.id ?? "");
  const [displayName, setDisplayName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [status, setStatus] = useState<"idle" | "starting" | "processing" | "cancelled" | "error">("idle");
  const [message, setMessage] = useState("");

  // Keep the latest choices in a ref so PayPal callbacks never read stale values.
  const latest = useRef({ cashCents, needId, displayName, anonymous });
  latest.current = { cashCents, needId, displayName, anonymous };

  const selectedNeed = needs.find((n) => n.id === needId);
  const totalCents = mode === "cash" ? cashCents : (selectedNeed?.priceCents ?? 0);
  const valid = mode === "cash" ? cashCents >= 100 && cashCents <= 50000 : !!selectedNeed;

  function onCustom(value: string) {
    setCustomAmount(value);
    const cents = Math.round(Number.parseFloat(value) * 100);
    setCashCents(Number.isFinite(cents) ? cents : 0);
  }

  async function createOrder() {
    setStatus("starting");
    setMessage("");
    const l = latest.current;
    const input: StartInput =
      mode === "cash"
        ? { mode: "cash", charitySlug: charity.slug, cashCents: l.cashCents }
        : { mode: "gift", charitySlug: charity.slug, needId: l.needId };
    const res = await startCheckout(input);
    if (!res.ok) {
      setStatus("error");
      setMessage(res.error);
      throw new Error(res.error);
    }
    setStatus("idle");
    return { orderId: res.paypalOrderId };
  }

  async function onApprove({ orderId }: OnApproveDataOneTimePayments) {
    setStatus("processing");
    const l = latest.current;
    const res = await finishCheckout(orderId, { displayName: l.displayName, anonymous: l.anonymous });
    if (res.ok) {
      router.push(`/give/success?ref=${encodeURIComponent(res.ref)}`);
    } else {
      router.push(`/give/failed?reason=${encodeURIComponent(res.error)}&cause=${encodeURIComponent(charity.slug)}`);
    }
  }

  if (!paypalClientId) {
    return <Alert severity="error">PayPal is not configured yet (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).</Alert>;
  }

  if (status === "processing") {
    return (
      <ElfLoader
        compact
        title="Thank you for giving!"
        messages={PAYMENT_MESSAGES}
        note="Please don't close this page."
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {mode === "cash" ? (
        <Box>
          <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Choose an amount</Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={customAmount ? null : cashCents}
            onChange={(_, v: number | null) => {
              if (v) {
                setCustomAmount("");
                setCashCents(v);
              }
            }}
            sx={{
              gap: 1,
              "& .MuiToggleButton-root": {
                border: "2px solid",
                borderColor: "divider",
                borderRadius: "14px !important",
                fontWeight: 800,
                fontSize: "1.05rem",
                py: 1.25,
              },
              "& .MuiToggleButton-root.Mui-selected, & .MuiToggleButton-root.Mui-selected:hover": {
                borderColor: "#166534",
                bgcolor: "#f0fdf4",
                color: "#166534",
              },
            }}
          >
            {PRESETS.map((p) => (
              <ToggleButton key={p} value={p}>
                {fmt(p)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            fullWidth
            type="number"
            label="Other amount"
            placeholder="1 to 500"
            value={customAmount}
            onChange={(e) => onCustom(e.target.value)}
            sx={{ mt: 1.5 }}
            error={!!customAmount && !valid}
            helperText={!!customAmount && !valid ? "Please choose between $1 and $500." : " "}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
              htmlInput: { min: 1, max: 500, step: 1 },
            }}
          />
        </Box>
      ) : (
        <Box>
          <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Choose a gift from the wishlist</Typography>
          {needs.length === 0 && <Alert severity="info">This charity has no open gift requests right now.</Alert>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }} role="radiogroup" aria-label="Wishlist gifts">
            {needs.map((n) => {
              const active = n.id === needId;
              return (
                <Box
                  key={n.id}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setNeedId(n.id)}
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: "14px",
                    border: "2px solid",
                    borderColor: active ? "primary.main" : "divider",
                    bgcolor: active ? "#f0fdf4" : "background.paper",
                    transition: "border-color .15s, background-color .15s",
                    "&:hover": { borderColor: active ? "primary.main" : "#d6d3d1" },
                    "&:focus-visible": { outline: "3px solid #bbf7d0" },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      bgcolor: active ? "primary.main" : "#fff1f2",
                      color: active ? "#fff" : "secondary.main",
                    }}
                  >
                    {active ? <CheckCircleRoundedIcon fontSize="small" /> : <CardGiftcardRoundedIcon fontSize="small" />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{n.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ages {n.ageGroup}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800 }}>{fmt(n.priceCents)}</Typography>
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Soon the Elf will also suggest real products with live prices.
          </Typography>
        </Box>
      )}

      <Box>
        <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Your name on public pages</Typography>
        <TextField
          fullWidth
          label="Display name"
          placeholder="e.g. Priya S."
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={anonymous}
          slotProps={{ htmlInput: { maxLength: 40 } }}
        />
        <FormControlLabel
          sx={{ mt: 0.5 }}
          control={<Checkbox checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />}
          label={<Typography variant="body2">Show me as Anonymous</Typography>}
        />
      </Box>

      <Divider />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
          Total
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "2rem", color: "primary.main", lineHeight: 1 }}>
          {fmt(totalCents)}
        </Typography>
      </Box>

      {status === "error" && <Alert severity="error">{message}</Alert>}
      {status === "cancelled" && <Alert severity="info">Payment cancelled. Nothing was charged or saved.</Alert>}
      {status === "starting" && (
        <Alert severity="info" icon={<CircularProgress size={18} />}>
          Opening PayPal…
        </Alert>
      )}

      {valid ? (
        <PayPalProvider clientId={paypalClientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
          {/* Skeleton shows while PayPal's script loads, then hides once <paypal-button> is ready. */}
          <Box
            sx={{
              position: "relative",
              minHeight: 52,
              "&:has(paypal-button:defined) .pp-skeleton": { display: "none" },
              // PayPal's web component sets a fixed 225px width; outside styles win over its :host rules.
              "& paypal-button": {
                display: "block",
                width: "100%",
                height: 52,
                "--paypal-button-border-radius": "999px",
              },
            }}
          >
            <Skeleton
              className="pp-skeleton"
              variant="rounded"
              height={52}
              sx={{ position: "absolute", inset: 0, borderRadius: 999 }}
              aria-hidden="true"
            />
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <PayPalOneTimePaymentButton
                createOrder={createOrder}
                onApprove={onApprove}
                onCancel={() => setStatus("cancelled")}
                onError={() => {
                  setStatus("error");
                  setMessage((m) => m || "PayPal reported an error. Nothing was saved. Please try again.");
                }}
                presentationMode="auto"
              />
            </Box>
          </Box>
        </PayPalProvider>
      ) : (
        <Alert severity="warning">Choose {mode === "cash" ? "an amount between $1 and $500" : "a gift"} to continue.</Alert>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}
      >
        <LockOutlinedIcon sx={{ fontSize: 14 }} /> PayPal sandbox: use your sandbox buyer account. No real money moves.
      </Typography>
    </Box>
  );
}

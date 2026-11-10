"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PayPalOneTimePaymentButton,
  PayPalProvider,
  type OnApproveDataOneTimePayments,
} from "@paypal/react-paypal-js/sdk-v6";
import { finishCheckout, startCheckout, type StartInput } from "@/app/give/actions";

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
    if (Number.isFinite(cents)) setCashCents(cents);
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
    return <p className="alert alert-error">PayPal is not configured yet (missing NEXT_PUBLIC_PAYPAL_CLIENT_ID).</p>;
  }

  return (
    <div className="checkout">
      {mode === "cash" ? (
        <fieldset className="field">
          <legend>Choose an amount</legend>
          <div className="amounts">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={!customAmount && cashCents === p ? "amount active" : "amount"}
                onClick={() => {
                  setCustomAmount("");
                  setCashCents(p);
                }}
              >
                {fmt(p)}
              </button>
            ))}
            <label className="amount-custom">
              <span>$</span>
              <input
                type="number"
                min={1}
                max={500}
                step="1"
                placeholder="Other"
                value={customAmount}
                onChange={(e) => onCustom(e.target.value)}
                aria-label="Custom amount in US dollars"
              />
            </label>
          </div>
          {!valid && <p className="hint">Please choose between $1 and $500.</p>}
        </fieldset>
      ) : (
        <fieldset className="field">
          <legend>Choose a gift from {charity.name}&apos;s wishlist</legend>
          {needs.length === 0 && <p className="muted">This charity has no open gift requests right now.</p>}
          <div className="need-options">
            {needs.map((n) => (
              <label key={n.id} className={n.id === needId ? "need-option active" : "need-option"}>
                <input type="radio" name="need" value={n.id} checked={n.id === needId} onChange={() => setNeedId(n.id)} />
                <span className="need-title">{n.title}</span>
                <span className="muted small">Ages {n.ageGroup}</span>
                <strong>{fmt(n.priceCents)}</strong>
              </label>
            ))}
          </div>
          <p className="hint">Soon the Elf will also suggest real products with live prices.</p>
        </fieldset>
      )}

      <fieldset className="field">
        <legend>How should we show your name?</legend>
        <input
          type="text"
          className="text-input"
          maxLength={40}
          placeholder="Display name (e.g. Priya S.)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className="check">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          Show me as Anonymous on public pages
        </label>
      </fieldset>

      <div className="summary">
        <span>Total</span>
        <strong>{fmt(totalCents)}</strong>
      </div>

      {status === "error" && <p className="alert alert-error">{message}</p>}
      {status === "cancelled" && <p className="alert">Payment cancelled. Nothing was charged or saved.</p>}
      {status === "starting" && (
        <p className="alert loading-line" role="status">
          <span className="spinner spinner-small" aria-hidden="true" /> Opening PayPal…
        </p>
      )}
      {status === "processing" && (
        <div className="processing" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <strong>Confirming your payment with PayPal…</strong>
          <span className="muted small">Please don&apos;t close this page.</span>
        </div>
      )}

      {valid && status !== "processing" ? (
        <PayPalProvider
          clientId={paypalClientId}
          environment="sandbox"
          components={["paypal-payments"]}
          pageType="checkout"
        >
          {/* Placeholder sits behind the button while PayPal's script loads. */}
          <div className="paypal-slot">
            <div className="paypal-placeholder" aria-hidden="true">
              <span className="spinner spinner-small" /> Loading PayPal…
            </div>
            <div className="paypal-button-layer">
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
            </div>
          </div>
        </PayPalProvider>
      ) : null}

      <p className="muted small">
        PayPal sandbox: use your sandbox buyer account. No real money moves.
      </p>
    </div>
  );
}

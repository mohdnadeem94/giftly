// PayPal server helpers (server only). Sandbox only.
// Orders: https://developer.paypal.com/docs/api/orders/v2/
// Authorize, then capture or void later: https://developer.paypal.com/docs/checkout/standard/customize/authorization/
// Method names checked against the installed @paypal/paypal-server-sdk type definitions.
import { CheckoutPaymentIntent, Client, Environment, OrdersController, PaymentsController } from "@paypal/paypal-server-sdk";

let client: Client | null = null;
let ordersController: OrdersController | null = null;
let paymentsController: PaymentsController | null = null;

function paypalClient(): Client {
  if (!client) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("PayPal credentials are not configured");
    client = new Client({
      clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret },
      environment: Environment.Sandbox, // hackathon prototype: never Production
    });
  }
  return client;
}

function orders(): OrdersController {
  return (ordersController ??= new OrdersController(paypalClient()));
}

function payments(): PaymentsController {
  return (paymentsController ??= new PaymentsController(paypalClient()));
}

export function centsToValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function valueToCents(value: string | undefined | null): number {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : NaN;
}

export type PaymentIntent = "CAPTURE" | "AUTHORIZE";

/**
 * Create a PayPal order for an amount that came from OUR server, never from the browser.
 * CAPTURE charges at once (cash). AUTHORIZE only places a hold (gifts), charged later when the charity buys.
 */
export async function createPayPalOrder(opts: { amountCents: number; customId: string; description: string; intent: PaymentIntent }) {
  const { result } = await orders().createOrder({
    body: {
      intent: opts.intent === "AUTHORIZE" ? CheckoutPaymentIntent.Authorize : CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: { currencyCode: "USD", value: centsToValue(opts.amountCents) },
          customId: opts.customId,
          description: opts.description.slice(0, 127),
        },
      ],
    },
  });
  if (!result.id) throw new Error("PayPal order creation failed: missing order ID");
  return result.id;
}

export async function getPayPalOrder(id: string) {
  const { result } = await orders().getOrder({ id });
  return result;
}

export async function capturePayPalOrder(id: string) {
  const { result } = await orders().captureOrder({ id });
  return result;
}

export async function authorizePayPalOrder(id: string) {
  const { result } = await orders().authorizeOrder({ id });
  return result;
}

export type VerifiedPayment = {
  intent: PaymentIntent;
  customId: string;
  cents: number;
  payerEmail: string | null;
  authorizationId: string | null; // only for AUTHORIZE
  authorizationExpiresAt: Date | null; // PayPal's own expiry for the hold
};

/**
 * Re-read the order from PayPal and check it really completed (captured, or held for gifts).
 * Returns null if anything does not look right. Never trust the browser for this.
 */
export async function verifyPayPalOrder(id: string): Promise<VerifiedPayment | null> {
  const order = await getPayPalOrder(id);
  if (String(order.status) !== "COMPLETED") return null;

  if (order.purchaseUnits?.length !== 1 || !["AUTHORIZE", "CAPTURE"].includes(String(order.intent))) return null;
  const unit = order.purchaseUnits[0];
  if (!unit?.customId) return null;
  const intent: PaymentIntent = String(order.intent) === "AUTHORIZE" ? "AUTHORIZE" : "CAPTURE";

  if (intent === "AUTHORIZE") {
    const auth = unit.payments?.authorizations?.[0];
    if (!auth?.id || String(auth.status) !== "CREATED") return null;
    if (auth.amount?.currencyCode !== "USD") return null;
    const cents = valueToCents(auth.amount?.value);
    if (!Number.isFinite(cents) || !auth.expirationTime || !Number.isFinite(Date.parse(auth.expirationTime)) || Date.parse(auth.expirationTime) <= Date.now()) return null;
    return {
      intent,
      customId: unit.customId,
      cents,
      payerEmail: order.payer?.emailAddress ?? null,
      authorizationId: auth.id,
      authorizationExpiresAt: auth.expirationTime ? new Date(auth.expirationTime) : null,
    };
  }

  const capture = unit.payments?.captures?.[0];
  if (!capture || String(capture.status) !== "COMPLETED") return null;
  if (capture.amount?.currencyCode !== "USD") return null;
  const cents = valueToCents(capture.amount?.value);
  if (!Number.isFinite(cents)) return null;
  return { intent, customId: unit.customId, cents, payerEmail: order.payer?.emailAddress ?? null, authorizationId: null, authorizationExpiresAt: null };
}

/** Current state of a hold: CREATED, CAPTURED, PARTIALLY_CAPTURED, VOIDED, DENIED, EXPIRED or PENDING. */
export async function getAuthorizationStatus(authorizationId: string): Promise<string | null> {
  const { result } = await payments().getAuthorizedPayment({ authorizationId });
  return result.status ? String(result.status) : null;
}

/**
 * Charge a held payment. The amount comes from our database and must equal the hold.
 * paypalRequestId makes a retry safe: PayPal returns the same capture instead of charging twice.
 */
export async function captureAuthorization(authorizationId: string, amountCents: number): Promise<{ ok: boolean; cents: number; status: string }> {
  const { result } = await payments().captureAuthorizedPayment({
    authorizationId,
    paypalRequestId: `giftly-capture-${authorizationId}-${amountCents}`,
    prefer: "return=representation", // full response, including the captured amount
    body: { amount: { currencyCode: "USD", value: centsToValue(amountCents) }, finalCapture: true },
  });
  // Always verify the capture resource, including a pending or idempotent replay response.
  if (!result.id) return { ok: false, cents: NaN, status: "UNKNOWN" };
  const { result: capture } = await payments().getCapturedPayment({ captureId: result.id });
  const status = String(capture.status ?? "");
  const cents = valueToCents(capture.amount?.value);
  return { ok: status === "COMPLETED" && capture.amount?.currencyCode === "USD" && cents === amountCents, cents, status };
}

/** Release a hold so the donor is never charged. Safe to call twice. */
export async function voidAuthorization(authorizationId: string): Promise<boolean> {
  try {
    await payments().voidPayment({ authorizationId, paypalRequestId: `giftly-void-${authorizationId}` });
    return true;
  } catch (err) {
    // Already voided or expired counts as released. Anything else is a real failure.
    const status = await getAuthorizationStatus(authorizationId).catch(() => null);
    if (status === "VOIDED" || status === "EXPIRED") return true;
    console.error("PayPal void failed", { status });
    return false;
  }
}

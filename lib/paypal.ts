// PayPal server helpers (server only). Sandbox only.
// API usage follows PayPal's official Next.js guide for @paypal/paypal-server-sdk:
// https://developer.paypal.com/guides/nextjs-checkout
import { CheckoutPaymentIntent, Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

let ordersController: OrdersController | null = null;

function orders(): OrdersController {
  if (!ordersController) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("PayPal credentials are not configured");
    ordersController = new OrdersController(
      new Client({
        clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret },
        environment: Environment.Sandbox, // hackathon prototype: never Production
      })
    );
  }
  return ordersController;
}

export function centsToValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function valueToCents(value: string | undefined | null): number {
  if (!value) return NaN;
  return Math.round(Number.parseFloat(value) * 100);
}

/** Create a PayPal order for an amount that came from OUR server, never from the browser. */
export async function createPayPalOrder(opts: { amountCents: number; customId: string; description: string }) {
  const { result } = await orders().createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
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

export type VerifiedPayment = {
  customId: string;
  capturedCents: number;
  payerEmail: string | null;
};

/**
 * Re-read the order from PayPal after capture and check it really completed.
 * Returns null if anything does not look right. Never trust the browser for this.
 */
export async function verifyCapturedOrder(id: string): Promise<VerifiedPayment | null> {
  const order = await getPayPalOrder(id);
  if (String(order.status) !== "COMPLETED") return null;

  const unit = order.purchaseUnits?.[0];
  const capture = unit?.payments?.captures?.[0];
  if (!unit?.customId || !capture) return null;
  if (String(capture.status) !== "COMPLETED") return null;
  if (capture.amount?.currencyCode !== "USD") return null;

  const capturedCents = valueToCents(capture.amount?.value);
  if (!Number.isFinite(capturedCents)) return null;

  return {
    customId: unit.customId,
    capturedCents,
    payerEmail: order.payer?.emailAddress ?? null,
  };
}

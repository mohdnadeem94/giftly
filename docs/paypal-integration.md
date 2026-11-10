# PayPal integration notes (Step 4)

## Doc sources used
- PayPal, "Integrate PayPal Checkout with Next.js": https://developer.paypal.com/guides/nextjs-checkout
  (Client + `clientCredentialsAuthCredentials`, `Environment.Sandbox`, `OrdersController.createOrder` /
  `captureOrder`, `@paypal/react-paypal-js/sdk-v6` `PayPalProvider` + `PayPalOneTimePaymentButton`)
- PayPal, "PayPal Checkout with Node.js and Express": https://developer.paypal.com/guides/node-express

APIMatic ContextMatic was not available in the environment where this step was written,
so the code follows the official PayPal guides above. (If you run ContextMatic later, log
its lookups in `docs/apimatic-usage.md`.)

## Flow
1. Donor picks a charity and a cash amount ($1 to $500) or a wishlist gift.
2. `startCheckout` (server action) looks the price up in **our database** and creates a PayPal
   order. The purchase unit's `custom_id` encodes what is being paid for
   (`giftly:cash:<charityId>:<cents>` or `giftly:need:<needId>`). Nothing is saved yet.
3. Donor approves in the PayPal sandbox popup.
4. `finishCheckout` captures the order, then **re-reads it from PayPal** and checks:
   order `COMPLETED`, capture `COMPLETED`, currency USD, and captured amount equals the
   amount our database expects for that `custom_id`.
5. Only then is the `Order` (and `OrderItem` for gifts) saved: `RECEIVED` for cash, `PAID` for gifts.
   The PayPal order ID is stored privately and is unique, so a double click cannot create two records.
6. Cancel or error: nothing is saved.

Files: `lib/paypal.ts`, `lib/giving.ts`, `app/give/actions.ts`, `components/Checkout.tsx`,
`app/give/[slug]/page.tsx`, `app/give/success/page.tsx`, `app/give/failed/page.tsx`.

## Hold-until-proof (authorize now, capture later) — research, NOT implemented
The Orders API supports `intent: AUTHORIZE`: the buyer approves, the server calls
`authorizeOrder`, and later captures the authorization (Payments API, capture authorized
payment) when proof arrives, or voids it if the gift is never delivered. This works in the sandbox.

Constraints to verify in PayPal's current docs before building it:
- An authorization has an honor period (commonly 3 days) and a maximum validity (commonly 29 days);
  re-authorization may be needed for longer holds.
- Charity purchases take days, so for the prototype we keep `CAPTURE` and represent
  "hold and release" as status records (Paid -> Bought -> Delivered), stated honestly in the UI.

## Testing with the sandbox buyer
developer.paypal.com > Testing Tools > Sandbox Accounts > the **Personal** account:
use its email and password in the PayPal popup. Check the result in Studio (`npm run db:studio`):
exactly one new `Order` per successful payment, none for a cancelled one.

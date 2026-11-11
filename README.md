# Giftly

Follow your gift from click to delivery.

Giftly is a PayPal AI Hackathon 2026 prototype for giving cash or choosing a gift for a cause. The AI Elf recommends products from Channel3, explains its choices, and answers questions from stored charity information. The donor approves checkout; the AI cannot set payment amounts or move money.

## Payment flow

- **Cash:** captured immediately after server verification.
- **Gifts:** authorized at checkout, then captured when the charity clicks **Buy ? charge donor**. Payment does not wait until delivery.
- **Before Buy:** Channel3 re-checks the same catalog product. Equal or lower prices can be charged; a lower price releases the unused hold. The best offer may be at another store.
- **Price increase or sold out:** no capture; the gift stays blocked until release. There is no donor approval screen for a replacement or higher price.
- **Catalog outage:** the existing policy falls back to the saved donor-approved amount. Availability is unconfirmed in this case. Wishlist items without a catalog ID use their stored price.
- **Unused holds:** released after 72 hours, or sooner if PayPal's authorization expires. Release can also be requested by the charity. A scheduled job is needed for unattended release; page visits also sweep expired holds.
- **Delivery:** requires a captured payment and accepted receipt proof. An AI-written thank-you follows delivery.

## Real versus simulated

| Part | What this prototype does |
|---|---|
| Product search | Live Channel3 requests, with price and availability checks |
| Payment authorization, capture, void | Real API calls to **PayPal sandbox**, using test funds only |
| Merchant purchase | Simulated; clicking Buy does not place an order with a store |
| Charity payout | Simulated; capture goes to the configured sandbox merchant, not a charity's bank account |
| Delivery | Manually recorded demo status; no courier integration or independent delivery confirmation |
| Charity verification badges | Illustrative, not accreditation |
| Roles | Cookie-based demo switcher, not authentication |
| Charts and donation feed | Database aggregates including fictional seed records and sandbox transactions; only captured money counts as raised |
| Receipt review | Real model request when configured, with admin review; AI results can be wrong |

## Run locally

Use Node.js 20.9 or later and Postgres. Start from a disposable demo database.

```powershell
npm install
Copy-Item .env.example .env
# Fill in .env using your own service credentials.
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` deletes existing demo data. Do not run it against data you need to keep. Stop the dev server before regenerating Prisma on Windows if its runtime file is locked.

Open [Giftly locally](http://localhost:3000) and the [health check](http://localhost:3000/api/health). Health exposes configuration booleans, not credential values.

## Configuration

All credentials are read from environment variables. Keep `.env` private; `.env.example` contains names and comments only.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string; server only |
| `PAYPAL_CLIENT_ID` | Sandbox app client ID; server configuration |
| `PAYPAL_CLIENT_SECRET` | Sandbox app secret; server only |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same sandbox client ID used by checkout; intentionally public and set at build time |
| `CHANNEL3_API_KEY` | Server-side catalog access |
| `LLM_API_KEY` | Server-side model access |
| `LLM_BASE_URL` | Optional OpenAI-compatible provider endpoint; defaults to Gemini |
| `LLM_MODEL` | Optional provider model IDs, comma-separated; default fallback list is in `lib/llm.ts` |
| `LLM_REASONING_EFFORT` | Optional provider reasoning setting |
| `ADMIN_PASSCODE` | Required for the destructive reset endpoint; never put it in client code |
| `CRON_SECRET` | Bearer secret for the expired-hold job |
| `GIFT_HOLD_HOURS` | Development-only shorter hold duration, at most 72 hours; ignored in production |
| `BUY_CHECK_SIMULATE` | Development-only `cheaper`, `pricier`, or `soldout`; ignored in production |

`NODE_ENV` is set by the runtime. Production always uses the 72-hour hold policy, capped by PayPal's expiry.

## Architecture

Next.js App Router and React with TypeScript; MUI; Prisma/Postgres; the official PayPal server and browser SDKs; Channel3; an OpenAI-compatible LLM endpoint; AG Grid Community and AG Charts Community. Payment actions run on the server and resolve amounts from saved records or verified payment data. A donor's cash entry is validated and saved as a pending draft before its database amount is sent to PayPal.

Key files: `app/give/actions.ts`, `lib/giving.ts`, `lib/paypal.ts`, `lib/holds.ts`, `lib/buy-check.ts`, `app/charity/actions.ts`, `app/api/proofs/route.ts`, `lib/public-data.ts`, and `lib/chart-data.ts`.

## AI disclosure and privacy

**Models and tools.** In the app: Google Gemini models through Gemini's OpenAI-compatible API (the Elf agent with tool calling, receipt image checks, thank-you notes and the chart caption). In development: Claude (Anthropic) for architecture, most of the code, debugging and browser testing; OpenAI Codex for polish, the buy-time price re-check and the security review.

The Elf uses tool calls to search products and read stored cause information. Receipt comparison uses model vision. Thank-you messages and chart captions are generated from supplied gift details or aggregate facts. Model failures use explicit fallback states; a failed receipt review requires an admin decision. AI cannot authorize payments, choose charge amounts, or bypass delivery checks.

Do not enter child names, photographs, exact locations, contact details, or sensitive information in chats or uploads. Use age ranges and general regions. Receipt images and chat text are sent to the configured AI provider for the relevant task. Receipts are stored privately in the demo database. Public data excludes emails and PayPal references, masks anonymous donors, and exposes only donor-approved display names plus donation records and totals.

## Validation

```powershell
npm run typecheck
node --test scripts/security-audit.test.cjs
npm run build
```

The isolated security tests mock payment, catalog, and database services. They do not prove sandbox settlement or cross-process Postgres locking. The build may fetch the configured Google font.

For a manual demo, use a new sandbox Personal buyer and the Business account associated with the configured sandbox app. Verify an authorization after gift checkout, a completed capture after Buy, and a void after Release. Test delivery without proof, then with a matching or admin-approved receipt. Development simulations exercise price changes and sold-out paths; clear them after testing.

## Hosting and scheduled release

See [Render setup](docs/render-setup.md). Configure a scheduler to call `POST /api/cron/release-holds` every 15 minutes with `Authorization: Bearer <CRON_SECRET>` supplied privately. Missing or incorrect credentials are rejected. The cron endpoint processes up to 100 expired holds per call; release may lag the deadline until the next successful sweep.

The reset endpoint requires the `x-admin-passcode` header matching `ADMIN_PASSCODE`; selecting Admin alone is insufficient. Reset deletes records and must only be used for disposable demo data. Before wiping, it releases (voids) every outstanding PayPal hold so no sandbox donor is left with an orphaned hold; if PayPal can't release one, the reset stops and can be retried.

Example (PowerShell): `Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/reset -Headers @{ "x-admin-passcode" = "<ADMIN_PASSCODE>" }`

## Security review and submission prep

See [security findings and validation](docs/SECURITY-REVIEW.md) and the [submission draft and recording script](docs/SUBMISSION.md).

This is a sandbox demonstration, not a production donation service. Real authentication, charity onboarding, live payouts, settlement reconciliation, monitoring, and operational privacy controls require separate work before real-world use.

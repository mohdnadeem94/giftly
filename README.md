# Giftly 🎁

**Give a real gift to someone in need, and watch it arrive.**

Giftly is an AI-powered giving app built for the **PayPal AI Hackathon 2026**. A donor tells an AI helper, **the Elf**, who they want to help. The Elf finds real gifts with live prices from online stores, or suggests cash where it does more good. The donor pays with **PayPal**. For gifts, PayPal only **holds** the money, and the donor is charged when the charity actually buys the gift. The charity uploads a receipt, the AI checks it, and the donor follows the gift all the way to **Delivered**.

> ⚠️ **Hackathon prototype.** PayPal **sandbox** only (test money); store purchases, charity payouts and delivery are simulated. See [Real vs simulated](#real-vs-simulated).

- **Live demo:** https://giftly-ni7v.onrender.com (free tier: the first load can take up to a minute)
- **Demo video:** _add link_
- **Devpost text:** [docs/devpost.md](docs/devpost.md) · **Demo script:** [docs/demo-video.md](docs/demo-video.md) · **Security review:** [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md)

---

## What it does

| Feature | What happens |
|---|---|
| **Ask the Elf** | An AI agent understands who you want to help (age, budget, occasion), searches real products through **Channel3**, and shows 2–3 gift cards with a short reason each. It can also recommend cash, and answers questions about a charity only from that charity's own story and FAQ. |
| **Give a gift or cash** | Cash donations are charged at checkout. Gift payments are only **held** by PayPal. |
| **Charity buys, then the donor is charged** | The charity clicks **Buy**. Giftly re-checks the live price, then charges the held payment, so the charity never pays out of its own pocket. |
| **Fair pricing** | Cheaper now: the donor is charged less and the rest of the hold is released. Same item at another store: the link switches. Price went up or sold out: **no charge**. |
| **72-hour release** | Any hold not used within 72 hours is released (voided), so the donor is never charged. |
| **Receipt proof** | The charity uploads the store receipt; an AI vision check compares it to the chosen item and price. An admin can override. |
| **Delivered and thank-you** | Delivered is only allowed with an accepted receipt. The donor then gets a personal thank-you note written by the AI. |
| **Gift tracking** | Donors follow each gift: On hold → Bought → Delivered (or "Hold released, you weren't charged"). |
| **Open books** | Public charts and tables show where the money goes, with a one-line AI summary built only from the real numbers. No emails or payment IDs are ever shown, and Anonymous donors stay anonymous. |
| **Charity dashboard** | One table to buy held gifts, upload receipts, mark deliveries and export CSV. |

## Demo roles and sign-in

There are no real accounts. The **demo role switcher** in the header (Public · Donor · Charity · Admin) changes the view; the server still validates every action.

| Role | What you see |
|---|---|
| **Public** | Browse causes, charts and the public donation feed. Clicking **Donate**, **Give** or asking the Elf opens a **simulated sign-in** (display name only, no password), then returns you to what you were doing (the Elf answers your question automatically). |
| **Donor** | Give gifts and cash, chat with the Elf, **My gifts** tracker, "You gave" column on causes. |
| **Charity** | Pick which charity you act as. Your cause is highlighted, other causes are read-only (charities can't donate), and the **Dashboard** manages your gifts. |
| **Admin** | Donor view plus the dashboard (receipt override) and **Elf tests**. |

Demo data reset needs the `ADMIN_PASSCODE` (see [Reset the demo](#reset-the-demo)); choosing Admin in the switcher is not enough.

## How the money works

```
Cash:  checkout ──► PayPal CAPTURE (charged now) ──► counted as raised
Gift:  checkout ──► PayPal AUTHORIZE (held, not charged)
          ├─ charity clicks Buy ──► Channel3 price re-check
          │     ├─ same or cheaper ──► CAPTURE that amount (rest released) ──► Bought ──► receipt ──► Delivered
          │     └─ pricier / sold out ──► blocked, never charged ──► hold released
          ├─ charity clicks Release ──► VOID (never charged)
          └─ 72 hours pass ──► VOID automatically (never charged)
```

- Amounts always come from **our database, Channel3 or the verified PayPal order**, never from the browser or the AI.
- Every payment is **verified with PayPal on the server** before anything is saved.
- PayPal keeps a hold valid for up to 29 days; the **72-hour rule is Giftly's**, enforced on page loads, when Buy is clicked, and by a scheduled job (`/api/cron/release-holds`).
- Public totals count **only money actually charged**.

## Real vs simulated

| Part | Status |
|---|---|
| PayPal orders, authorizations (holds), captures, voids | ✅ Real API calls to the **PayPal sandbox** (test money only) |
| Product search, live prices and availability | ✅ Real, via **Channel3** |
| Elf recommendations, receipt checks, thank-you notes, chart summary | ✅ Real AI calls (**Google Gemini**) |
| Database, charts, tables | ✅ Real (Postgres, AG Grid, AG Charts) |
| Buying from the store | 🟡 Simulated: the charity buys manually; Giftly doesn't place store orders |
| Charity payouts | 🟡 Simulated: captured money goes to the sandbox merchant account |
| Physical delivery | 🟡 Simulated: status set by the charity, backed by the receipt check |
| Charity "Verified" badges | 🟡 Illustrative only |
| Sign-in and roles | 🟡 Simulated demo switcher, not real authentication |
| Seeded donations | 🟡 Fictional demo data; their product links point to `example.com` |

## Tech stack

- **Next.js 16** (App Router, React 19, TypeScript) with **MUI** for the UI
- **Postgres** on **Render**, accessed with **Prisma**
- **PayPal** Server SDK (`@paypal/paypal-server-sdk`: Orders and Payments APIs) and PayPal JS SDK v6 buttons
- **Channel3** product search API
- **Google Gemini** through its OpenAI-compatible API (tool calling and image input), with a model fallback list in `lib/llm.ts`
- **AG Grid Community** (tables) and **AG Charts Community** (charts)

### Architecture (short)

All money and AI logic runs on the server. Server actions create PayPal orders from database amounts (`app/give/actions.ts`, `lib/giving.ts`), verify and save them (`lib/paypal.ts`), and manage holds (`lib/holds.ts`, `lib/buy-check.ts`). The charity dashboard moves gifts through Paid → Bought → Delivered (`app/charity/actions.ts`), with receipt uploads checked by the AI (`app/api/proofs`, `lib/proof-check.ts`). The Elf is a tool-calling agent (`lib/elf/`). Public pages read safe, aggregated data only (`lib/public-data.ts`, `lib/chart-data.ts`).

## Run it locally

You need **Node.js 20.9+**, a **Postgres** database (Render's External Database URL works), and sandbox keys for PayPal, Channel3 and Gemini.

```powershell
npm install
Copy-Item .env.example .env     # then fill in your own keys (never commit .env)
npm run db:push                 # create the tables
npm run db:seed                 # load demo data (wipes existing demo data)
npm run dev                     # http://localhost:3000
```

- Health check: http://localhost:3000/api/health shows which settings are present (never their values).
- **Windows:** stop `npm run dev` before `npm run db:push`, or Prisma's files stay locked (`EPERM`).
- Checks: `npm run typecheck` and `node --test scripts/security-audit.test.cjs`.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal **sandbox** app credentials (server only) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same client ID for the browser button (public by design, set at build time) |
| `CHANNEL3_API_KEY` | Product search (server only) |
| `LLM_API_KEY` | Gemini API key (server only) |
| `LLM_BASE_URL`, `LLM_MODEL`, `LLM_REASONING_EFFORT` | Optional; default to Gemini and the fallback model list |
| `ADMIN_PASSCODE` | Required to reset the demo data |
| `CRON_SECRET` | Secret for the scheduled hold-release job |
| `GIFT_HOLD_HOURS` | Dev only: a shorter hold (1–72 h) for testing; ignored in production |
| `BUY_CHECK_SIMULATE` | Dev only: `cheaper`, `pricier` or `soldout` to test the Buy price check; ignored in production |

### Testing payments (sandbox)

1. Sign in (simulated) and give a gift. Approve it with your **sandbox Personal** account. The gift shows **On hold**.
2. Switch to **Charity**, open the Dashboard and click **Buy · charge donor**. The capture appears in the sandbox **Business** account.
3. Upload a receipt (samples in [`docs/sample-receipts/`](docs/sample-receipts/)), then mark it **Delivered**.
4. Try **Release** on another held gift: the hold is voided and the donor is never charged.

See the sandbox transactions by logging in at https://www.sandbox.paypal.com with the accounts from the PayPal Developer Dashboard (**Testing Tools → Sandbox Accounts**), or under **Event Logs → API Calls**.

## Deploy on Render

See [docs/render-setup.md](docs/render-setup.md) for the full walkthrough. In short:

1. **Postgres** (paid instance recommended so it doesn't expire during judging) plus a **Web Service** from this repo.
2. Build: `npm install && npm run build` · Start: `npx prisma db push --skip-generate && npm start` · Health check: `/api/health`.
3. Add all environment variables above (not the dev-only ones).
4. Add a **Cron Job** every 15 minutes to release expired holds:
   ```
   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-service>.onrender.com/api/cron/release-holds
   ```

## Reset the demo

Reset releases every outstanding PayPal hold first (so no sandbox donor keeps an orphaned hold), then wipes and reloads the demo data. It needs your `ADMIN_PASSCODE`:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/admin/reset -Headers @{ "x-admin-passcode" = "<ADMIN_PASSCODE>" }
```

Use your Render URL instead of `localhost:3000` to reset the live site. If PayPal can't release a hold, the reset stops without deleting anything; just try again.

## Privacy and safety

- We never ask for a child's name, photo, school or exact location; only age ranges and general regions.
- The Elf never sets amounts, never moves money, and treats product text and receipts as untrusted (instructions inside them are ignored).
- Receipt images are stored privately and visible only to the charity that uploaded them and admins.
- Public data excludes emails, PayPal order and authorization IDs, and personal details.

## AI tools and models disclosure

**In the app**

| Model / service | Used for |
|---|---|
| **Google Gemini** (via its OpenAI-compatible API; default fallback list `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3.8-flash`) | The Elf agent (tool calling: product search, causes, charity info, gift recommendations, cash suggestions); receipt image checks; thank-you notes; the one-line chart summary |

AI output can be wrong. That's why receipts can be reviewed by an admin, and AI never decides amounts or moves money.

**In development**

| Tool | What it did |
|---|---|
| **Claude** (Anthropic), in the Claude app and Claude Code | Architecture, most of the code, debugging, and browser testing |
| **OpenAI Codex** | UI polish and mobile layout (Step 11), the buy-time price re-check, and the security review (Step 12) |

The human author designed the product, made the decisions, tested it and is responsible for the submission.

## Limits (prototype)

No real authentication or charity onboarding, no real payouts or store orders, and no webhook-based settlement reconciliation. PayPal and the database can't commit atomically, so rare network failures may need manual sandbox reconciliation. Details in [docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md).

## License

MIT

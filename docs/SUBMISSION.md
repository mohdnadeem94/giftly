# Giftly submission preparation

Draft only. No submission has been published and no video has been recorded. Confirm the hackathon's current submission fields, time limit, eligibility and AI-disclosure requirements before submitting.

## Project name

Giftly

## Tagline

An AI giving helper with sandbox payment holds and a gift journey you can follow.

## Inspiration

Giving feels more tangible when a donor can choose a useful gift and follow what happens next. We wanted the AI to help with selection and explanation while keeping payment authority with the donor and verification on the server.

## What it does

Giftly helps donors explore causes, ask an Elf for gift ideas, compare real catalog products, or give cash. Gift payments are held at checkout, then charged when the charity buys. Before capture, the app re-checks the same product: a lower price means a smaller charge, while a price increase or sold-out result blocks purchase. Unused holds are released after 72 hours. A charity records purchase, uploads a receipt, and can mark delivery only with accepted proof. Donors see updates and an AI-written thank-you; public charts show captured sandbox totals without private payment references.

## How we built it

Next.js, React, TypeScript, MUI and Prisma/Postgres support the app. PayPal's official SDK handles sandbox orders, authorizations, captures and voids. Channel3 supplies catalog search, price and availability. A configured OpenAI-compatible model powers the Elf, receipt comparison, thank-you text and aggregate chart captions. AG Grid and AG Charts provide tracking tables and transparency views.

## Challenges

The key challenge was keeping the AI helpful without making it a payment authority. Server-owned amounts, a fresh product check, final capture of at most the authorized amount, receipt gates and privacy-safe data selections keep those responsibilities explicit. Another challenge was showing the difference between a held payment, a completed capture and simulated charity operations.

## Accomplishments

The prototype connects discovery, sandbox authorization, charity purchase checks, receipt review, donor tracking and public summaries in one demonstrable flow. Security regression checks cover the important payment and access boundaries using isolated mocks.

## What we learned

An authorization is not a completed payment, a capture is not a charity payout, and a receipt is not independent proof of physical delivery. We built the demo and its disclosures around those distinctions.

## What's next

For any real-world use: authenticated roles, actual charity onboarding, payout and merchant integrations, verified delivery, robust settlement reconciliation, operational monitoring and stronger data-lifecycle controls. These are future work, not features claimed by this submission.

## AI disclosure

Runtime AI assists recommendations, stored-text answers, receipt comparison, thank-you text and aggregate captions. AI does not approve donor payments or set charge amounts. Receipt verdicts can be wrong and support admin review. Models: Google Gemini (via its OpenAI-compatible API) powers the Elf, receipt checks, thank-you notes and chart captions. Development tools: Claude (Anthropic) and OpenAI Codex were used as coding assistants.

## Real versus simulated statement

Product lookup and model calls are live when configured. PayPal calls use sandbox test funds only. Merchant purchases, charity payouts, delivery, verification badges and roles are simulated. Charts include fictional seed records and sandbox transactions. Cash captures at checkout; gifts capture at Buy, not on delivery.

## Recording script (approximately three minutes; adapt to event rules)

| Time | Screen and action | Narration |
|---|---|---|
| 0:00-0:20 | Home and demo disclosure | Explain the donor problem and identify this as a sandbox prototype. |
| 0:20-0:50 | Elf conversation and cause | Ask for an age-range/budget recommendation; show a real catalog product and reasoning. No child names or personal details. |
| 0:50-1:20 | Sandbox checkout and My gifts | Approve a new gift with a sandbox Personal account; show On hold. Explain that no charge is completed yet. |
| 1:20-1:50 | Charity dashboard | Show Availability, then Buy. Verify the capture in sandbox activity. Merchant purchase and payout are simulated. |
| 1:50-2:15 | Receipt upload and delivery | Show a sample receipt, accepted proof and Delivered. Explain AI limitations and admin review. |
| 2:15-2:35 | My gifts and public transparency | Show the thank-you and captured totals; private payment references are absent. |
| 2:35-3:00 | Prepared blocked/cheaper gift | Show no charge on price rise/sold-out, or a lower capture with released remainder. Close with real-versus-simulated disclosure. |

## Final handoff checklist

- Apply any outstanding schema changes to the intended demo DB; use fictional records.
- Run TypeScript and security regression checks, then a full build and browser walkthrough in the target environment.
- Verify new authorization, exact/lower capture and void in sandbox activity; check both buyer and configured merchant accounts.
- Confirm the release cron has its secret configured and a scheduler actually invokes it.
- Do not reset while holds or captures still need reconciliation: resetting records does not void PayPal authorizations.
- Clear simulation overrides before a normal public demo. Use local development only for simulated price outcomes.
- Record the video, then add its URL, deployed demo URL, repository URL and actual team details in the submission form.
- Check screenshots/video for credentials, emails, authorization IDs, real receipts and browser account information.
- Review the final wording and submit manually. No live-fund readiness is claimed.

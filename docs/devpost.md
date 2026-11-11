# Giftly: Devpost project description

> Copy each section into the matching Devpost field. Replace the _italic placeholders_ before submitting.

**Project name:** Giftly

**Tagline (short):** Give a real gift to someone in need, and watch it arrive. You're charged only when the charity buys it.

**Built with:** PayPal (Orders & Payments APIs, sandbox), Google Gemini, Channel3, Next.js, TypeScript, React, MUI, Prisma, PostgreSQL, AG Grid, AG Charts, Render

**Links:** live demo https://giftly-ni7v.onrender.com · code _GitHub repo URL_ · video _YouTube link_

---

## Inspiration

Every holiday season people want to give *something real*: a winter coat, a storybook, a lunchbox. But donating to a charity often feels like dropping money into a black box. You don't know what it bought, whether it arrived, or whether your money did anything. Meanwhile small charities often have to buy gifts with their own scarce cash first and hope donations cover it later.

We wanted giving that feels like buying a gift for a friend: you pick something real, you see it get bought, you see the receipt, and you hear back when it arrives. And nobody should pay until the gift is actually being bought.

## What it does

- **Ask the Elf.** Tell our AI helper who you'd like to help ("a storybook for a 6-year-old under $15", "warm clothes for a family"). The Elf searches real products with live prices through Channel3 and shows 2–3 gift cards with a one-line reason each. When cash would do more good, it says so honestly. It also answers questions about a charity, using only that charity's own words.
- **Pay with PayPal.** Cash donations are charged right away. For gifts, PayPal only **holds** the money.
- **The charity buys, then you're charged.** When the charity clicks **Buy**, Giftly re-checks the live price and charges the hold, so the charity has the money to buy with and never pays out of its own pocket. If the price dropped, you pay less and the rest of the hold is released. If it went up or sold out, you're not charged at all.
- **72-hour promise.** If the charity doesn't buy your gift within 72 hours, the hold is released automatically and you're never charged.
- **Receipt proof.** The charity uploads the store receipt and the AI checks it matches your gift and price. Only then can the gift be marked **Delivered**, and you get a personal thank-you note.
- **Track every gift.** On hold → Bought → Delivered, all in "My gifts".
- **Open books.** Anyone can see where the money goes in live charts and tables, with a one-line AI summary, and without any private data.

## How PayPal is used (and why it's essential)

PayPal isn't just the pay button; it's the trust layer of the whole product:

- **Orders API with `AUTHORIZE` intent** for gifts: the donor approves, and the money is held, not taken.
- **Payments API `capture`** when the charity clicks Buy, for the exact re-checked amount, with `final_capture` so a cheaper price automatically **releases the unused part** of the hold.
- **Payments API `void`** when a hold isn't used within 72 hours or the charity releases it: the donor is never charged.
- **`CAPTURE` intent** for cash donations.
- Every payment is **verified on the server** with PayPal (status, currency, amount, expiry) before anything is saved. Amounts come only from our database or PayPal, never from the browser or the AI. Idempotency keys make retries safe, and database row locks stop a gift from being charged twice.

Without PayPal's authorize, capture and void, the core promise ("you're only charged when your gift is actually bought") wouldn't be possible.

## How AI is used (and why it's essential)

Powered by **Google Gemini**:

- **The Elf agent** uses tool calling (search products, list causes, read charity info, recommend gifts, suggest cash) to turn a sentence into real, age-appropriate, in-budget gift options. It never sets amounts and never moves money.
- **Receipt verification** with image input compares the uploaded receipt to the chosen item and price (MATCH / MISMATCH / UNCLEAR). It ignores any instructions hidden inside the image, and an admin can override it.
- **Thank-you notes** written from the gift details after delivery.
- **Chart caption**: a one-sentence summary generated only from the real numbers.

## How we built it

- **Next.js 16 + TypeScript** with **MUI**; all money and AI logic runs server-side.
- **Channel3** for live product search and prices, plus the buy-time price re-check.
- **AG Grid** for the charity dashboard (inline status, bulk Buy, receipts, CSV export) and the public causes and donations tables; **AG Charts** for raised-over-time, funds by category, top causes, cash vs gifts, and the gift journey. Clicking a chart slice filters the table.
- **PostgreSQL + Prisma**, hosted with the web app on **Render**, plus a Render Cron Job that releases expired holds.
- Built with AI coding assistants (**Claude** and **OpenAI Codex**); see the README's AI disclosure.

## Challenges we ran into

- **Making "pay only when it's bought" real.** We first captured at checkout, which made our promise untrue. Switching to authorize, capture and void meant handling expiry, partial capture, retries and race conditions safely.
- **Not making charities pay first.** Holding money until *delivery* would force charities to front the cost, so we capture at *Buy* instead.
- **Prices change.** A gift can get cheaper, pricier or sell out between checkout and purchase, so we added a server-side re-check with a "never charge more without approval" rule.
- **LLM reliability.** Some models returned 404 or 503 for new keys, so we built a model fallback list with timeouts.
- **Prompt injection in receipts.** We tested a receipt containing a hidden "NOTE TO AI", and the checker ignores it.

## Accomplishments we're proud of

- A full, working loop: AI recommendation → PayPal hold → charity Buy (capture) → AI receipt check → Delivered → thank-you.
- The donor is never charged for a gift that isn't bought, and pays less if the price drops.
- Public transparency with no private data leaks, plus a security review of every payment path.

## What we learned

- PayPal's authorize, capture and void flow maps beautifully onto real-world giving.
- AI is most trustworthy when it advises and verifies, and the money rules stay in plain server code.

## What's next for Giftly

- A donor approval screen when a price goes up, with the Elf suggesting alternatives
- Real charity onboarding, verification and PayPal payouts to charities
- Store checkout integration so purchases are automatic
- Real accounts and PayPal webhooks for settlement reconciliation

## Real vs simulated (please read)

Real: PayPal **sandbox** API calls (orders, holds, captures, voids), Channel3 live products and prices, Gemini AI calls, and the database, charts and tables. Simulated: test money only; store purchases, charity payouts and delivery are manual demo steps; charity badges are illustrative; sign-in and roles are a demo switcher; seeded donations are fictional.

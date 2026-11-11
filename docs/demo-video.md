# Giftly: demo video script (under 3 minutes)

Record in the browser at 100% zoom, 1280×800 or larger. Speak slowly and keep each scene short. Times are targets.

| Time | Scene | On screen (what to click) | What to say |
|---|---|---|---|
| **0:00–0:15** | Problem | Home page hero | "Giving to charity often feels like a black box: you don't know what your money bought or if it arrived. Small charities often pay up front and hope donations cover it. Giftly fixes both." |
| **0:15–0:40** | Ask the Elf | As **Public**, type in the Elf chat: *"A storybook for a 6-year-old under $15"* → the **simulated sign-in** appears → click **Sign in (simulated)** → the Elf answers with 2–3 real product cards | "Anyone can browse. To give, you sign in (simulated for the demo), and the Elf, powered by Google Gemini, finds real gifts with live prices from Channel3 and explains each pick." |
| **0:40–1:05** | PayPal hold | Click **Gift this** → checkout → PayPal sandbox popup → approve → success page shows **🔒 On hold** | "I pay with PayPal, but for gifts PayPal only *holds* the money. I'm not charged yet. If the charity doesn't buy it within 72 hours, the hold is released automatically." |
| **1:05–1:30** | Charity buys | Switch role to **Charity** (pick the same charity) → Dashboard → the gift shows **Held · 71h left** → click **Buy · charge donor** → toast "Donor charged…" | "The charity clicks Buy. Giftly re-checks the live price first: cheaper means I pay less, pricier or sold out means I'm not charged at all. Then PayPal captures the hold, so the charity never pays out of its own pocket." |
| **1:30–1:55** | Receipt + AI check | Click **Add receipt** → upload `docs/sample-receipts/receipt-MATCH-early-reader-book-bundle.png` (or a receipt matching your gift) → result shows the AI verdict | "The charity uploads the store receipt and the AI checks it against the exact item and price. It even ignores hidden instructions inside the image." |
| **1:55–2:10** | Delivered + thank-you | Click **Mark Delivered** → switch to **Donor** → **My gifts** shows the timeline and the thank-you note | "Delivered is only allowed with an accepted receipt. I can follow my gift from On hold to Bought to Delivered, and I get a personal thank-you." |
| **2:10–2:30** | Open books | **Causes** page → click a donut slice (the table filters) → scroll the charts and the donations table | "Everyone can see where the money goes in live AG Charts and AG Grid tables, with an AI summary built only from the real numbers, and no private data." |
| **2:30–2:45** | Released hold | Back in **Charity** Dashboard → on a second held gift click **Release** → **Confirm release** → (optional) the donor sees "Hold released, you weren't charged" | "If the charity can't buy a gift, it's released and the donor is never charged." |
| **2:45–3:00** | Close | Home page | "Giftly: AI finds the gift, PayPal holds the money until it's bought, and you watch it arrive. This is a sandbox demo: test money only, and store purchases, payouts and delivery are simulated." |

> Need a second held gift for the Release scene? Make two gift payments before recording (both will show "On hold").

## Pre-recording checklist

**Night before / an hour before**
- [ ] Latest code pushed and the Render deploy finished (check the deploy log)
- [ ] Render environment variables set: `DATABASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `CHANNEL3_API_KEY`, `LLM_API_KEY`, `ADMIN_PASSCODE`, `CRON_SECRET`
- [ ] `BUY_CHECK_SIMULATE` and `GIFT_HOLD_HOURS` **not** set on Render (and removed from local `.env`)
- [ ] Open `/api/health`: PayPal, Channel3 and the LLM all report configured
- [ ] Run `node scripts/llm-check.mjs` locally: at least one Gemini model answers
- [ ] Sandbox **Personal** buyer email and password ready (Developer Dashboard → Testing Tools → Sandbox Accounts)

**Right before recording**
- [ ] **Reset the demo data** (this releases any old holds first):
  `Invoke-RestMethod -Method Post -Uri https://giftly-ni7v.onrender.com/api/admin/reset -Headers @{ "x-admin-passcode" = "<ADMIN_PASSCODE>" }`
- [ ] Open the live site once to wake it up (free tier sleeps), then reload
- [ ] Do one full **dry run** (Elf → hold → Buy → receipt → Delivered), then reset again
- [ ] Start as **Public**, signed out (click **Sign out** if "Hi, …" shows)
- [ ] Have the sample receipt file ready in File Explorer: `docs/sample-receipts/`
- [ ] Close other tabs and notifications (Windows Focus / Do Not Disturb on)
- [ ] Browser zoom 100%, window large; hide bookmarks bar
- [ ] Recorder ready: **Win + Alt + R** (Xbox Game Bar) or Snipping Tool → Record; microphone checked
- [ ] Never show `.env`, terminal secrets or the PayPal sandbox password on screen

**After recording**
- [ ] Video under 3 minutes; upload to YouTube (Public or Unlisted, per the Devpost rules)
- [ ] Add the video link to the README and Devpost
- [ ] Submit on Devpost before **Nov 12, 12:00 pm Pacific (2:00 pm Central)**

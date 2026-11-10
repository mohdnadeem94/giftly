# Render setup (Step 1)

Render deploys from GitHub, so push this folder to a **public** GitHub repo first.

## 1. Postgres database
Render dashboard > New > Postgres
- Name: `giftly-db`
- Region: pick one and use the same region for the web service
- Plan: Free (note: free Postgres expires after a limited time; fine for the hackathon)
- After it's created, copy:
  - **Internal Database URL** -> for the Render web service
  - **External Database URL** -> for your local `.env` (so local dev uses the same DB)

## 2. Web service
Render dashboard > New > Web Service > connect your GitHub repo
- Runtime: Node
- Branch: `main`
- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm run db:deploy && npm start`
  (Before Step 2 there are no migrations; you can use just `npm start` until then.)
- Plan: Free
- Health check path: `/api/health`
- Environment variables (Environment tab):
  - `DATABASE_URL` = Internal Database URL
  - `NODE_VERSION` = `22`
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `CHANNEL3_API_KEY`, `LLM_API_KEY` (add as you get them)

Note: `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## 3. Check
Open `https://<your-service>.onrender.com/` (home page) and `/api/health`
(shows which env vars are set, never their values).
Free services sleep after inactivity; the first load can take ~1 minute. Open it before recording the demo.

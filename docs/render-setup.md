# Render setup

Render deploys from GitHub, so push this repo to a **public** GitHub repository first.

## 1. Postgres database
Render dashboard → **New → Postgres**
- Name: `giftly-db`
- Region: pick one, and use the same region for the web service
- Plan: the **paid starter** instance is recommended (Render's free Postgres expires after 30 days, which could fall during judging)
- After it's created, copy:
  - **Internal Database URL** → for the Render web service
  - **External Database URL** → for your local `.env` (so local dev uses the same database)

## 2. Web service
Render dashboard → **New → Web Service** → connect the GitHub repo
- Runtime: **Node** · Branch: `main`
- Build command: `npm install && npm run build` (`npm install` runs `prisma generate` via `postinstall`)
- Start command: `npx prisma db push --skip-generate && npm start` (`db push` creates or updates the tables; it refuses changes that would delete data)
- Health check path: `/api/health`
- Environment variables (Environment tab):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Internal Database URL |
| `NODE_VERSION` | `22` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal **sandbox** app credentials |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same sandbox client ID (baked in at build time, so redeploy after changing it) |
| `CHANNEL3_API_KEY` | Channel3 key |
| `LLM_API_KEY` | Gemini API key (`LLM_BASE_URL`, `LLM_MODEL` optional) |
| `ADMIN_PASSCODE` | Long random string, the same as your local `.env` |
| `CRON_SECRET` | Long random string for the hold-release job |

Do **not** set `GIFT_HOLD_HOURS` or `BUY_CHECK_SIMULATE` on Render (they're for local testing and are ignored in production anyway).

## 3. Cron job: release expired payment holds
Gift payments are held for at most 72 hours. Pages that list gifts release expired holds too, but a scheduled job makes sure it happens even if nobody visits.

Render dashboard → **New → Cron Job**
- Schedule: `*/15 * * * *` (every 15 minutes)
- Environment variable: `CRON_SECRET` (the same value as the web service)
- Command:
  ```
  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-service>.onrender.com/api/cron/release-holds
  ```
A wrong or missing secret returns 401, and a missing `CRON_SECRET` on the web service returns 503.

## 4. Tables and demo data
With `DATABASE_URL` in your local `.env` set to the **External** Database URL:
```
npm run db:push    # create/update tables (stop `npm run dev` first on Windows)
npm run db:seed    # wipe and load demo data
npm run db:studio  # optional: browse data at http://localhost:5555
```
Local and Render share the database, so seeding from your PC also seeds the live site.

## 5. Reset before a demo
Reset releases every outstanding PayPal hold, then wipes and reloads the demo data:
```
curl -X POST https://<your-service>.onrender.com/api/admin/reset -H "x-admin-passcode: <ADMIN_PASSCODE>"
```
PowerShell:
```
Invoke-RestMethod -Method Post -Uri https://<your-service>.onrender.com/api/admin/reset -Headers @{ "x-admin-passcode" = "<ADMIN_PASSCODE>" }
```

## 6. Check
Open `https://<your-service>.onrender.com/` and `/api/health` (shows which settings are present, never their values). Free web services sleep after inactivity, and the first load can take about a minute, so open it before recording or judging.

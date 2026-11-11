# Render setup

Render deploys from GitHub, so push this folder to a **public** GitHub repo first.

## 1. Postgres database
Render dashboard > New > Postgres
- Name: `giftly-db`
- Region: pick one and use the same region for the web service
- Plan: Free (free Postgres expires after a limited time; fine for the hackathon)
- After it's created, copy:
  - **Internal Database URL** -> for the Render web service
  - **External Database URL** -> for your local `.env` (so local dev uses the same DB)

## 2. Web service
Render dashboard > New > Web Service > connect your GitHub repo
- Runtime: Node
- Branch: `main`
- Build command: `npm install && npm run build`
  (`npm install` runs `prisma generate` automatically via `postinstall`)
- Start command: `npx prisma db push --skip-generate && npm start`
  (`db push` creates/updates the tables from `prisma/schema.prisma`; it refuses
  changes that would delete data, so it is safe to run on every start)
- Plan: Free
- Health check path: `/api/health`
- Environment variables (Environment tab):
  - `DATABASE_URL` = Internal Database URL
  - `NODE_VERSION` = `22`
  - `ADMIN_PASSCODE` = same value as your local `.env`
  - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `CHANNEL3_API_KEY`, `LLM_API_KEY` (add as you get them)

Note: `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## 3. Database: tables and seed data
We use `prisma db push` (no migration files) to keep things simple for the hackathon.

From your PC, with `DATABASE_URL` in `.env` set to the **External** Database URL:
```
npm run db:push    # create the tables
npm run db:seed    # wipe and load demo data
npm run db:studio  # optional: browse the data at http://localhost:5555
```
Because local and Render use the same database, seeding from your PC also seeds the live site.

Reset from anywhere (e.g. right before recording the demo):
```
curl -X POST https://<your-service>.onrender.com/api/admin/reset -H "x-admin-passcode: <ADMIN_PASSCODE>"
```
PowerShell:
```
Invoke-RestMethod -Method Post -Uri https://<your-service>.onrender.com/api/admin/reset -Headers @{ "x-admin-passcode" = "<ADMIN_PASSCODE>" }
```

## 4. Check
Open `https://<your-service>.onrender.com/` and `/api/health`
(shows which env vars are set, never their values).
Free services sleep after inactivity; the first load can take ~1 minute. Open it before recording the demo.

# Giftly: submission checklist

Deadline: **Nov 12, 2026, 12:00 pm Pacific (2:00 pm Central)**. Aim to submit the morning of Nov 12.

| What | Where |
|---|---|
| Devpost description (copy into Devpost) | [devpost.md](devpost.md) |
| Demo video script and pre-recording checklist | [demo-video.md](demo-video.md) |
| Setup, real vs simulated, AI disclosure | [../README.md](../README.md) |
| Security review | [SECURITY-REVIEW.md](SECURITY-REVIEW.md) |
| Deploying on Render (+ cron job) | [render-setup.md](render-setup.md) |

## Final steps

1. [ ] `npm run typecheck` passes; `node --test scripts/security-audit.test.cjs` passes
2. [ ] One full sandbox run locally: Elf → hold → Buy → receipt → Delivered, plus a Release
3. [ ] Commit and push; the Render deploy is green; the Render Cron Job is created
4. [ ] Live site works in a **private window** (sign-in, Elf, PayPal sandbox, dashboard)
5. [ ] Reset the demo data, then record the video (under 3 minutes) following [demo-video.md](demo-video.md)
6. [ ] Upload the video; put the video, repo and live links in the README and Devpost
7. [ ] Check the official Devpost rules (required fields, video length, AI disclosure, prize categories)
8. [ ] Submit on Devpost

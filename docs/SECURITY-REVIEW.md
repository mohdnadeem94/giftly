# Giftly Step 12 security review

Reviewed 2026-11-10. Scope: current source, local Git history, environment contract, payment/status paths, public serializers, upload/access gates. No real payments, database resets, secret rotations, or live deployments were performed.

## Findings first, then fixes

| Finding | Risk before review | Fix / disposition |
|---|---|---|
| Cash amount went from validated browser input straight into checkout resolution | Charge source did not satisfy the strict DB-only checkout rule | Validate donor proposal as integer cents, persist PENDING cash draft, resolve amount from DB, bind draft to PayPal custom ID and record that draft after verification |
| Capture accepted PENDING and did not verify currency | Gift could be treated as paid before settlement or with an unexpected currency | Always GET the capture; accept only COMPLETED, USD, exact requested cents; pending/unknown states do not advance the gift |
| Permissive payment parsing and missing authorization-expiry validation | Partial or malformed values could be accepted | Strict positive decimal-cent parser; one purchase unit and recognized intent; valid future authorization expiry |
| Finish endpoint attempted payment before checking saved checkout details | Arbitrary payment reference could reach authorize/capture first | Resolve and compare the PayPal purchase unit, USD amount and expected intent before a charge attempt |
| Capture and void were not serialized | Simultaneous actions could disagree about payment state | Postgres Order row locks inside transactions serialize capture/release; re-read state under lock; 60-second transaction bound |
| Missing local hold expiry did not prevent capture | Invalid hold record could bypass expiry policy | Fail closed on missing/expired hold expiry; limit to both DB total and original authorization amount |
| Status transition relied on earlier snapshots | Non-captured or concurrently revoked proof state could be advanced | Filter valid payment states, require CAPTURED in the update predicate, and re-check the selected accepted proof in the delivery write predicate |
| Multipart body was parsed before size checks | Oversized request could consume excessive memory | Bound streamed body to 2 MB + 64 KB multipart overhead before parsing, retain 2 MB file cap and ownership/BOUGHT checks; full PNG signature |
| Raw payment SDK errors were logged | Authenticated request metadata could appear in logs | Remove raw error objects from audited payment, admin and cron logs |
| A public display name could itself contain contact details | Donor-entered email/phone could appear publicly | Shared public donor label masks contact-looking names; Anonymous always remains Anonymous |
| Hold duration override affected production | Test settings could alter the advertised production policy | Production ignores GIFT_HOLD_HOURS and BUY_CHECK_SIMULATE |
| Reset could delete outstanding hold records | Scheduled release would lose the references it needs | Reset first voids every AUTHORIZED hold through PayPal; if any void fails, the reset stops (409) and wipes nothing |
| README and payment tagline described an obsolete flow | Misleading payment and demo disclosures | Explain authorize at checkout, capture at Buy, 72-hour unused release, simulated purchase/payout/delivery |

## Checks that were already enforced

- Catalog charge amounts are fetched by saved externalId on the server; AI selects only fetched product IDs and cannot supply payment amounts.
- Buy-time price increases/sold-out gifts remain blocked and uncharged; wishlist items use saved amounts. API failure fallback to saved approved amount is intentional user-requested policy, not confirmed availability.
- Cash is captured at checkout; gifts use authorization and final capture at Buy. Lower capture releases the unused authorization balance.
- Public stats, causes, charts and feeds use explicit selections. No emails, paypalOrderId, paypalAuthorizationId, donor IDs or receipt bytes are returned. Named donors appear only by approved display label; anonymous donors are masked.
- Cron: missing configuration -> 503, missing/incorrect bearer -> 401, only matching CRON_SECRET invokes release.
- Reset: missing configuration -> 503, missing/incorrect passcode -> 403. Admin cookie does not bypass passcode.
- Uploads and private receipt images are scoped to the acting charity. Upload requires BOUGHT and a CAPTURED order; private image responses use no-store and nosniff.
- Receipt instructions and product text are untrusted. MATCH with missing/nonpositive price or missing title now becomes UNCLEAR; admin rejection overrides an AI MATCH.

## Secrets and environment audit

Executed the requested equivalent of `git log -p | findstr /i "secret api_key password client_secret"` with output captured and values suppressed. The checked local history produced **50 matching lines** (36 additions); further credential-literal and credential-format checks found **no confirmed exposed credentials**. Current application source had no matches for the checked private-key, Google API-key, or password-bearing Postgres URL patterns. All 13 requested environment variables are documented in `.env.example` and read on the server, except the deliberately public NEXT_PUBLIC_PAYPAL_CLIENT_ID.

**Rotation recommendation:** none identified by this scan. This is not proof that every credential format or remote/unreachable history is clean. If a real value was shared elsewhere, revoke it at the provider and replace its environment value; changing Git history alone does not revoke credentials. Never include values in reports or commits.

DATABASE_URL is read by Prisma's environment configuration. Optional LLM settings have code defaults. NODE_ENV is supplied by the runtime. Production ignores both test overrides; only the PayPal client ID is intentionally sent to the browser.

## Validation and limits

Run `npm run typecheck` and `node --test scripts/security-audit.test.cjs`. Regression coverage includes completed/pending/currency/amount capture verification, invalid/expired authorizations, original-amount ceiling, production overrides, blocked Buy, status/proof gates, cash DB snapshots, public labels, cron/reset rejection, upload size/type and charity scope.

Tests use isolated mocks. They do not exercise a real Postgres concurrency race, live PayPal/Channel3, provider retries, a full browser journey, or network settlement. Verify those separately in sandbox; never use real donor data.

## Remaining prototype limits

- Role/charity cookies are deliberately selectable demo controls, not authentication or tenancy security against an attacker. Use only sandbox funds and fictional people. Replacing authentication is outside this step.
- PayPal and Postgres cannot commit atomically. A network timeout or database failure after a completed external capture may need manual sandbox reconciliation. Amount-specific idempotency and PayPal finalCapture prevent ordinary retry double-charges; no automated settlement-reconciliation feature was added.
- The capture/void lock is held during the provider request. The transaction has a timeout; network delays can cause a rollback after an external side effect. Do not assume every failure means no charge occurred.
- A pending capture does not authorize fulfillment. If it later settles, verify it manually; no webhook/reconciliation feature was added.
- The application refuses captures after the local deadline. Actual release occurs on a successful page sweep or scheduled job; the cron processes a bounded batch.
- The audit did not include a dependency-advisory scan, penetration test, cloud account/IAM review, or proof of model resistance to every prompt injection.

## Reference checks

PayPal changes use existing installed SDK methods and were checked against official [capture states](https://developer.paypal.com/sdk/payment/v2/definitions/capture/) and Prisma's [interactive transaction guidance](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). No SDK method names were invented.

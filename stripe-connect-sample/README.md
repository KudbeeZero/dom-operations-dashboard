# Stripe Connect — sample integration

A self-contained Node.js + Express reference app that demonstrates a full Stripe
**Connect** flow. It is **separate** from the static marketing site in the repo
root (that site is plain HTML/CSS/JS on Cloudflare Pages) — this sample needs a
Node server and your **secret** key, so run it locally or on a Node host.

## What it covers
1. **Create a connected account** — V2 Accounts API (`v2.core.accounts.create`), no top-level `type`.
2. **Onboard** — V2 Account Link (`v2.core.accountLinks.create`) + live status read from the API.
3. **Create products** on the connected account (`Stripe-Account` header via `{ stripeAccount }`).
4. **Storefront** — one page per account at `/storefront/<accountId>`; customers buy via **Direct Charge + application fee**.
5. **Subscriptions** — charge a platform subscription to the connected account (`customer_account`) + **billing portal**.
6. **Webhooks** — Connect requirement/capability changes (**thin**, V2) and subscription lifecycle (**snapshot**, V1).

## Setup
```bash
cd stripe-connect-sample
cp .env.example .env        # then fill in STRIPE_SECRET_KEY (sk_test_…)
npm install                 # installs the latest `stripe` SDK
npm start                   # http://localhost:4242
```
`npm install` pulls the latest SDK (the package is pinned to `latest`; to lock a
specific release see https://github.com/stripe/stripe-node/releases). The Stripe
**API version** is chosen automatically by the SDK — you don't set it.

If `STRIPE_SECRET_KEY` is missing the server exits with a clear message instead of
failing mid-request. Per-flow placeholders (`PLATFORM_SUBSCRIPTION_PRICE_ID`,
webhook secrets) return helpful errors only when you exercise that flow.

## Webhooks (local)
Use two destinations with the Stripe CLI (https://docs.stripe.com/cli/listen):

**Connect (thin / V2):**
```bash
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' \
  --forward-thin-to localhost:4242/webhooks/connect
```
Copy the printed `whsec_…` into `CONNECT_WEBHOOK_SECRET`.

**Subscriptions (snapshot / V1):**
```bash
stripe listen --forward-to localhost:4242/webhooks/subscriptions
```
Copy that `whsec_…` into `SUBSCRIPTION_WEBHOOK_SECRET`.

In production, create the equivalent destinations in the Dashboard
(Developers → Webhooks). For the Connect one choose **Payload style → Thin** and
**Events from → Connected accounts**.

## Notes / TODOs for a real app
- Replace the in-memory `usersToAccounts` map with a database (`TODO(db)` markers in `server.js`). Store only the `userId → accountId` mapping; **account status is always read live** from the API.
- Don't expose `acct_…` in storefront URLs long-term — map a friendly slug to the account id server-side.
- The platform fee is a sample 10% (`application_fee_amount`); set your real pricing.
- Never commit `.env` (already in `.gitignore`). Never use a billing email as a login credential.

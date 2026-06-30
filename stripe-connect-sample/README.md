# Stripe Connect — sample integration

A self-contained Node.js + Express reference app showing a **Connect platform** where:

- connected accounts are **recipients** (the platform owns pricing and fee collection),
- **products are created at the platform level** and mapped to a connected account,
- a shared **storefront** lists every product, and
- purchases are **destination charges** — the customer pays the platform, the platform keeps
  an application fee, and the rest is transferred to the product's connected account.

> This app is a standalone demo. It does **not** touch the static marketing site in the repo
> root and is not deployed by Cloudflare — you run it locally with `npm start`.

## What it demonstrates
1. **Create a connected account** — V2 Accounts API, recipient configuration. Never passes a
   top-level `type`.
2. **Onboard + live status** — V2 Account Links (`configurations: ['recipient']`); status is
   always read **live from the API**, never cached.
3. **Create products** — at the **platform** level, with the connected account id stored in
   product `metadata`.
4. **Storefront** — lists all products and all connected accounts.
5. **Process charges** — Stripe-hosted Checkout, **destination charge** with
   `payment_intent_data.transfer_data.destination` + `application_fee_amount` (10% sample fee).
6. **Webhooks** — **thin** V2 Connect events for requirement/capability changes.

## Setup
```bash
cd stripe-connect-sample
npm install
cp .env.example .env      # then paste your sk_test_… key
npm start                 # http://localhost:4242
```
If `STRIPE_SECRET_KEY` is missing the app exits with a clear message. The Stripe API version
is **not** pinned in code — the installed SDK targets the latest version it ships with
(currently `2026-06-24.dahlia`); upgrade the `stripe` package to move it forward.

## Try the flow
1. Open `http://localhost:4242/` → **Create account** → **Onboard to receive payments**
   (Stripe-hosted). Come back and **Refresh status** until it reads *Ready to receive payments*.
2. **Add a product** (it's created on the platform and mapped to your account).
3. Open the **Storefront** (`/storefront`) → **Buy** → pay with a Stripe test card
   (`4242 4242 4242 4242`, any future expiry/CVC). Funds land on the connected account; the
   application fee stays on the platform.

## Webhooks (requirement / capability changes)
Connected-account requirements can change (regulators, card networks, banks). This app listens
for **thin** V2 events at `POST /webhooks/connect`.

**Local, with the Stripe CLI:**
```bash
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[.recipient].capability_status_updated' \
  --forward-thin-to localhost:4242/webhooks/connect
```
Copy the `whsec_…` it prints into `CONNECT_WEBHOOK_SECRET` in `.env` and restart.

**In the Dashboard:** Developers → Webhooks → **Add destination** → *Events from* =
**Connected accounts** → *Show advanced options* → *Payload style* = **Thin** → add the event
types `v2.core.account[requirements].updated` and
`v2.core.account[.recipient].capability_status_updated`.

## Notes / next steps
- The user→account map and "list of connected accounts" are **in-memory** and reset on restart
  (`TODO(db)` markers in `server.js`) — swap in a real database for production.
- Product→account routing is stored in product **metadata** for the demo; a real app would
  likely keep this in its own database too.
- This sample omits platform subscriptions / billing portal by design — it focuses on the
  onboard → products → storefront → destination-charge path.

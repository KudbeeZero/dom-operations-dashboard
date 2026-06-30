// ============================================================================
//  Stripe Connect — sample integration (Node.js + Express)
//
//  Model: connected accounts are RECIPIENTS, and the PLATFORM is responsible
//  for pricing and fee collection. Money flows via DESTINATION CHARGES: the
//  customer pays the platform, the platform takes an application fee, and the
//  rest is transferred to the connected account.
//
//  Flows included (each is a clearly-labelled section below):
//    1. Create a connected account            → V2 Accounts API (recipient)
//    2. Onboard it + read live status         → V2 Account Links + retrieve
//    3. Create products at the PLATFORM level → Products API (+ metadata map)
//    4. A storefront listing all products     → for customers to buy
//    5. Process a purchase                     → Destination Charge + app fee
//    6. React to requirement/capability change → THIN (V2) Connect webhooks
//
//  This is a self-contained reference app. Run it with `npm install && npm start`.
//  It does NOT touch the static marketing site in the repo root.
// ============================================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const Stripe = require('stripe');

// ── 1. Configuration + fail-fast validation ────────────────────────────────
// Surface a clear, actionable error if a required value is missing, rather than
// letting Stripe throw a cryptic auth error deep inside a request later.
const {
  STRIPE_SECRET_KEY,
  APP_BASE_URL = 'http://localhost:4242',
  CONNECT_WEBHOOK_SECRET,
  PORT = 4242,
} = process.env;

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('REPLACE_ME')) {
  // PLACEHOLDER: set STRIPE_SECRET_KEY in .env (copy from .env.example).
  console.error(
    '\n[config] Missing STRIPE_SECRET_KEY.\n' +
    '         Copy .env.example to .env and paste your platform secret key\n' +
    '         (sk_test_… from https://dashboard.stripe.com/apikeys), then restart.\n'
  );
  process.exit(1);
}

// ── 2. The Stripe Client — used for ALL Stripe requests ────────────────────
// We deliberately do NOT pin an apiVersion: the installed SDK already targets
// the latest API version it ships with (currently 2026-06-24.dahlia). To move
// the API version forward, upgrade the `stripe` package.
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

// ── 3. "Database" stand-in ──────────────────────────────────────────────────
// Maps your app's user -> Stripe connected account id. In-memory only for the
// demo; it resets on restart.
// TODO(db): replace this Map with real persistence (Postgres, etc.) storing
// { userId, stripeAccountId }. Per the spec, ACCOUNT STATUS is always read live
// from the Stripe API below (never cached here).
const usersToAccounts = new Map(); // key: demoUserId, value: accountId
const DEMO_USER_ID = 'demo-user-1'; // a single hard-coded user for the sample

const app = express();

// ── 4. Webhook FIRST, with a raw body ───────────────────────────────────────
// Signature verification needs the exact raw bytes, so this route must be
// registered BEFORE express.json() (which would consume/replace the body).
//
// CONNECT webhook — THIN events for V2 accounts (requirements/capabilities).
// Configure a destination in the Dashboard with Payload style = "Thin",
// Events from = "Connected accounts", selecting:
//   v2.core.account[requirements].updated
//   v2.core.account[.recipient].capability_status_updated
app.post('/webhooks/connect', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!CONNECT_WEBHOOK_SECRET || CONNECT_WEBHOOK_SECRET.includes('REPLACE_ME')) {
    // PLACEHOLDER: set CONNECT_WEBHOOK_SECRET in .env (whsec_… from the
    // destination you create, or printed by `stripe listen`).
    console.error('[webhook/connect] CONNECT_WEBHOOK_SECRET is not set — cannot verify signature.');
    return res.status(500).send('Connect webhook secret not configured.');
  }

  let thinEvent;
  try {
    // Thin events carry only an id + type; parse + verify the signature first.
    thinEvent = stripeClient.parseThinEvent(
      req.body,
      req.headers['stripe-signature'],
      CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook/connect] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Fetch the full event to understand what changed (thin events don't carry
    // the data payload themselves).
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        // Requirements can change due to regulators, card networks, or banks.
        // Re-fetch the account and see what's now due.
        const accountId = event.related_object?.id;
        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ['requirements'],
        });
        const status = account.requirements?.summary?.minimum_deadline?.status;
        console.log(`[webhook/connect] requirements updated for ${accountId} — status: ${status}`);
        // TODO(app): if new info is due, prompt the connected account to finish onboarding.
        break;
      }
      case 'v2.core.account[.recipient].capability_status_updated': {
        // The recipient configuration's capability (stripe_transfers) changed
        // status — e.g. it just became `active` (ready to receive transfers).
        const accountId = event.related_object?.id;
        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ['configuration.recipient'],
        });
        const transfers =
          account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;
        console.log(`[webhook/connect] recipient capability changed for ${accountId} — stripe_transfers: ${transfers}`);
        // TODO(app): enable/disable payouts in your UI based on this status.
        break;
      }
      default:
        console.log(`[webhook/connect] unhandled type: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook/connect] handler error:', err.message);
    // Still 200 so Stripe doesn't retry forever on a transient app error; change
    // to 500 if you want Stripe to retry delivery.
  }

  res.json({ received: true });
});

// ── 5. Normal middleware for the rest of the app ────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Small helper: turn any thrown Stripe/SDK error into a clean JSON 400.
const handle = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(`[${req.method} ${req.path}]`, err.message);
    res.status(400).json({ error: err.message });
  });

// ── 6. Create a connected account (V2 Accounts API — RECIPIENT) ─────────────
// IMPORTANT: never pass a top-level `type` (no 'express'/'standard'/'custom').
// The shape below is the supported V2 form for a recipient that the platform
// pays out to. `fees_collector`/`losses_collector: 'application'` means the
// PLATFORM (this app) is responsible for fees and losses.
app.post('/api/accounts', handle(async (req, res) => {
  const { displayName, contactEmail } = req.body;
  if (!displayName || !contactEmail) {
    return res.status(400).json({ error: 'displayName and contactEmail are required.' });
  }

  const account = await stripeClient.v2.core.accounts.create({
    display_name: displayName,
    contact_email: contactEmail,
    identity: {
      country: 'us',
    },
    dashboard: 'express',
    defaults: {
      responsibilities: {
        fees_collector: 'application',
        losses_collector: 'application',
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: {
              requested: true,
            },
          },
        },
      },
    },
  });

  // TODO(db): persist { userId -> account.id }. For the demo we keep one user.
  usersToAccounts.set(DEMO_USER_ID, account.id);

  res.json({ accountId: account.id });
}));

// ── 7. Create an onboarding Account Link (V2) ───────────────────────────────
// Sends the user to Stripe-hosted onboarding for the `recipient` configuration.
app.post('/api/accounts/:accountId/onboarding-link', handle(async (req, res) => {
  const { accountId } = req.params;

  const accountLink = await stripeClient.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        // Where Stripe sends the user if the link expires / needs refreshing…
        refresh_url: `${APP_BASE_URL}/?accountId=${accountId}&refresh=1`,
        // …and where it returns them when they finish (or step away).
        return_url: `${APP_BASE_URL}/?accountId=${accountId}`,
      },
    },
  });

  res.json({ url: accountLink.url });
}));

// ── 8. Live onboarding status (always read from the API, never cached) ──────
app.get('/api/accounts/:accountId/status', handle(async (req, res) => {
  const { accountId } = req.params;

  const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient', 'requirements'],
  });

  // Ready to receive transfers when the recipient's stripe_transfers capability
  // is active.
  const readyToReceivePayments =
    account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
    'active';

  // Onboarding is "complete enough" when nothing is currently or past due.
  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

  res.json({
    accountId,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus: requirementsStatus || null,
  });
}));

// ── 9. Create a product at the PLATFORM level ───────────────────────────────
// Products live on the PLATFORM account (no Stripe-Account header). We store the
// product -> connected account mapping in metadata so checkout knows where to
// route the funds.
app.post('/api/products', handle(async (req, res) => {
  const { name, description, priceInCents, accountId, currency = 'usd' } = req.body;
  if (!name || !priceInCents || !accountId) {
    return res.status(400).json({ error: 'name, priceInCents, and accountId are required.' });
  }

  const product = await stripeClient.products.create({
    name,
    description: description || undefined,
    default_price_data: {
      unit_amount: Number(priceInCents),
      currency,
    },
    // The mapping: which connected account should receive payment for this product.
    metadata: {
      connected_account_id: accountId,
    },
  });

  res.json({ productId: product.id });
}));

// ── 10. Storefront — all products from all connected accounts ───────────────
app.get('/storefront', handle(async (req, res) => {
  // All platform products, with their default Price expanded so we can show amounts.
  const products = await stripeClient.products.list({
    limit: 100,
    active: true,
    expand: ['data.default_price'],
  });

  res.send(renderStorefront(products.data, Array.from(usersToAccounts.values())));
}));

// ── 11. Process a purchase — DESTINATION CHARGE with an application fee ──────
// The Checkout Session is created on the PLATFORM (no Stripe-Account header).
// `transfer_data.destination` sends the funds to the connected account, and
// `application_fee_amount` is the platform's cut.
app.post('/api/checkout', handle(async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    return res.status(400).json({ error: 'productId is required.' });
  }

  // Look up the product to get its price and the destination connected account.
  const product = await stripeClient.products.retrieve(productId, {
    expand: ['default_price'],
  });
  const destination = product.metadata?.connected_account_id;
  const price = product.default_price;
  if (!destination) {
    return res.status(400).json({ error: 'Product is not mapped to a connected account.' });
  }
  if (!price?.id || price.unit_amount == null) {
    return res.status(400).json({ error: 'Product has no usable default price.' });
  }

  // Sample platform fee: 10% of the order total (in the smallest currency unit).
  const applicationFeeAmount = Math.round(price.unit_amount * Number(quantity) * 0.1);

  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: price.id, quantity: Number(quantity) }],
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination, // the connected account that receives the funds
      },
    },
    success_url: `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_BASE_URL}/storefront`,
  });

  res.json({ url: session.url });
}));

// ── 12. Tiny success page ───────────────────────────────────────────────────
app.get('/success', (req, res) => {
  res.send(page('Payment complete', `
    <h1>✓ Success</h1>
    <p>Checkout session: <code>${escapeHtml(req.query.session_id || '')}</code></p>
    <p><a href="/storefront">← Back to the storefront</a> · <a href="/">Dashboard</a></p>
  `));
});

app.listen(Number(PORT), () => {
  console.log(`\nStripe Connect sample running at ${APP_BASE_URL}`);
  console.log(`Dashboard:  ${APP_BASE_URL}/`);
  console.log(`Storefront: ${APP_BASE_URL}/storefront\n`);
});

// ── helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Shared page shell — clean, simple styling echoing the app's dark/teal look.
function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/style.css"></head>
<body><main class="wrap">${body}</main></body></html>`;
}

function renderStorefront(products, accountIds) {
  const cards = products.map((p) => {
    const price = p.default_price;
    const amount = price?.unit_amount;
    const currency = (price?.currency || 'usd').toUpperCase();
    const pretty = amount != null ? `$${(amount / 100).toFixed(2)} ${currency}` : '—';
    const dest = p.metadata?.connected_account_id || '—';
    const buyable = Boolean(price?.id && p.metadata?.connected_account_id);
    return `<article class="card">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="muted">${escapeHtml(p.description || '')}</p>
      <p class="price">${pretty}</p>
      <p class="muted">Seller: <code>${escapeHtml(dest)}</code></p>
      <button data-product="${escapeHtml(p.id)}" ${buyable ? '' : 'disabled'}>Buy</button>
    </article>`;
  }).join('') || '<p class="muted">No products yet. Add one from the dashboard.</p>';

  const accounts = accountIds.length
    ? `<ul>${accountIds.map((id) => `<li><code>${escapeHtml(id)}</code></li>`).join('')}</ul>`
    : '<p class="muted">No connected accounts yet.</p>';

  return page('Storefront', `
    <h1>Storefront</h1>
    <p class="muted">Every product across all connected accounts. Buying routes funds to that
      product's seller via a destination charge, minus the platform fee.</p>
    <div class="grid">${cards}</div>
    <section class="card">
      <h2>Connected accounts</h2>
      ${accounts}
    </section>
    <p><a href="/">← Dashboard</a></p>
    <script>
      document.querySelectorAll('button[data-product]').forEach((b) => {
        b.addEventListener('click', async () => {
          b.disabled = true; b.textContent = 'Redirecting…';
          const r = await fetch('/api/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: b.dataset.product, quantity: 1 }),
          });
          const data = await r.json();
          if (data.url) location.href = data.url;
          else { alert(data.error || 'Could not start checkout'); b.disabled = false; b.textContent = 'Buy'; }
        });
      });
    </script>
  `);
}

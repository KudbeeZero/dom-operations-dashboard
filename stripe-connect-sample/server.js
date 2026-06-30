// ============================================================================
//  Stripe Connect — sample integration (Node.js + Express)
//
//  Flows included:
//    1. Create a connected account (V2 Accounts API)
//    2. Onboard it with a V2 Account Link + live status from the API
//    3. Create products on the connected account (Stripe-Account header)
//    4. A per-account storefront for customers to buy (Direct Charge + app fee)
//    5. Charge a platform subscription to the connected account + billing portal
//    6. Webhooks: Connect requirement/capability changes (THIN, V2) and
//       subscription lifecycle (SNAPSHOT, V1)
//
//  This is a self-contained reference app. Run it with `npm install && npm start`.
//  It does NOT touch the static marketing site in the repo root.
// ============================================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const Stripe = require('stripe');

// ── 1. Configuration + fail-fast validation ────────────────────────────────
// We surface a clear, actionable error if a required value is missing rather
// than letting Stripe throw a cryptic auth error deep in a request.
const {
  STRIPE_SECRET_KEY,
  APP_BASE_URL = 'http://localhost:4242',
  PLATFORM_SUBSCRIPTION_PRICE_ID,
  CONNECT_WEBHOOK_SECRET,
  SUBSCRIPTION_WEBHOOK_SECRET,
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
// We deliberately do NOT pin apiVersion: the installed SDK already targets the
// latest API version it was built for (currently 2026-06-24.dahlia). Upgrade the
// `stripe` package to move forward.
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

// ── 3. "Database" stand-in ──────────────────────────────────────────────────
// Maps your app's user -> Stripe connected account id. In-memory only for the
// demo; it resets on restart.
// TODO(db): replace this Map with a real persistence layer (Postgres, etc.) and
// store { userId, stripeAccountId }. Per the spec, ACCOUNT STATUS is always read
// live from the Stripe API below (never cached here).
const usersToAccounts = new Map(); // key: demoUserId, value: accountId
const DEMO_USER_ID = 'demo-user-1'; // a single hard-coded user for the sample

const app = express();

// ── 4. Webhooks FIRST, with a raw body ──────────────────────────────────────
// Signature verification needs the exact raw bytes, so these routes must be
// registered before express.json() (which would consume/replace the body).

// 4a. CONNECT webhook — THIN events for V2 accounts (requirements/capabilities).
//     Configure a destination in the Dashboard with Payload style = "Thin",
//     Events from = "Connected accounts", selecting:
//       v2.core.account[requirements].updated
//       v2.core.account[configuration.merchant].capability_status_updated
//       v2.core.account[configuration.customer].capability_status_updated
app.post('/webhooks/connect', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!CONNECT_WEBHOOK_SECRET || CONNECT_WEBHOOK_SECRET.includes('REPLACE_ME')) {
    // PLACEHOLDER: set CONNECT_WEBHOOK_SECRET in .env (whsec_… from the
    // destination you create, or from `stripe listen`).
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
    // Fetch the full event to inspect what changed.
    const event = await stripeClient.v2.core.events.retrieve(thinEvent.id);

    switch (event.type) {
      case 'v2.core.account[requirements].updated': {
        // Requirements changed (often due to regulators/card networks). Pull the
        // account and collect anything newly due.
        const accountId = event.related_object?.id;
        const account = await stripeClient.v2.core.accounts.retrieve(accountId, {
          include: ['requirements'],
        });
        const status = account.requirements?.summary?.minimum_deadline?.status;
        console.log(`[webhook/connect] requirements updated for ${accountId} — status: ${status}`);
        // TODO(app): notify the connected account if new info is due.
        break;
      }
      case 'v2.core.account[configuration.merchant].capability_status_updated':
      case 'v2.core.account[configuration.customer].capability_status_updated': {
        const accountId = event.related_object?.id;
        console.log(`[webhook/connect] capability status changed for ${accountId} (${event.type}).`);
        // TODO(app): enable/disable features based on capability status.
        break;
      }
      default:
        console.log(`[webhook/connect] unhandled type: ${event.type}`);
    }
  } catch (err) {
    console.error('[webhook/connect] handler error:', err.message);
    // Still 200 so Stripe doesn't retry forever on a transient app error; adjust
    // to 500 if you want retries.
  }

  res.json({ received: true });
});

// 4b. SUBSCRIPTION webhook — SNAPSHOT (V1) events. These are NOT thin events.
app.post('/webhooks/subscriptions', express.raw({ type: 'application/json' }), (req, res) => {
  if (!SUBSCRIPTION_WEBHOOK_SECRET || SUBSCRIPTION_WEBHOOK_SECRET.includes('REPLACE_ME')) {
    // PLACEHOLDER: set SUBSCRIPTION_WEBHOOK_SECRET in .env.
    console.error('[webhook/subscriptions] SUBSCRIPTION_WEBHOOK_SECRET is not set — cannot verify signature.');
    return res.status(500).send('Subscription webhook secret not configured.');
  }

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      SUBSCRIPTION_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[webhook/subscriptions] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      // For V2 accounts the connected account id is on `customer_account` (acct_…),
      // NOT `customer`.
      const accountId = sub.customer_account;
      const price = sub.items?.data?.[0]?.price?.id;
      const quantity = sub.items?.data?.[0]?.quantity;
      const cancelAtPeriodEnd = sub.cancel_at_period_end;
      const paused = sub.pause_collection ? sub.pause_collection.behavior : null;
      console.log(`[webhook/subscriptions] updated ${accountId}: price=${price} qty=${quantity} cancelAtPeriodEnd=${cancelAtPeriodEnd} paused=${paused}`);
      // TODO(db): upsert this account's subscription status/price/quantity, and
      // grant/adjust access. Handle upgrade/downgrade, cancel-at-period-end, and
      // pause/resume (empty pause_collection => resumed).
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`[webhook/subscriptions] canceled ${sub.customer_account}`);
      // TODO(db): revoke access for this account.
      break;
    }
    case 'payment_method.attached':
    case 'payment_method.detached':
    case 'customer.updated':
    case 'customer.tax_id.created':
    case 'customer.tax_id.deleted':
    case 'customer.tax_id.updated':
    case 'billing_portal.configuration.created':
    case 'billing_portal.configuration.updated':
    case 'billing_portal.session.created':
      console.log(`[webhook/subscriptions] ${event.type}`);
      // TODO(db): keep billing info / payment methods in sync as needed. Never
      // use the billing email as a login credential.
      break;
    default:
      console.log(`[webhook/subscriptions] unhandled type: ${event.type}`);
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

// ── 6. Create a connected account (V2 Accounts API) ─────────────────────────
// NOTE: never pass a top-level `type` (no 'express'/'standard'/'custom'). The
// shape below is the supported V2 form.
app.post('/api/accounts', handle(async (req, res) => {
  const { displayName, contactEmail } = req.body;
  if (!displayName || !contactEmail) {
    return res.status(400).json({ error: 'displayName and contactEmail are required.' });
  }

  const account = await stripeClient.v2.core.accounts.create({
    display_name: displayName,
    contact_email: contactEmail,
    identity: { country: 'us' },
    dashboard: 'full',
    defaults: {
      responsibilities: {
        fees_collector: 'stripe',
        losses_collector: 'stripe',
      },
    },
    configuration: {
      customer: {},
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
    },
  });

  // TODO(db): persist { userId -> account.id }. For the demo we keep one user.
  usersToAccounts.set(DEMO_USER_ID, account.id);

  res.json({ accountId: account.id });
}));

// ── 7. Create an onboarding Account Link (V2) ───────────────────────────────
app.post('/api/accounts/:accountId/onboarding-link', handle(async (req, res) => {
  const { accountId } = req.params;

  const accountLink = await stripeClient.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant', 'customer'],
        // Stripe sends the user back here if the link expires/needs refreshing…
        refresh_url: `${APP_BASE_URL}/?accountId=${accountId}&refresh=1`,
        // …and here when they finish (or step away from) onboarding.
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
    include: ['configuration.merchant', 'requirements'],
  });

  const readyToProcessPayments =
    account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status;
  const onboardingComplete =
    requirementsStatus !== 'currently_due' && requirementsStatus !== 'past_due';

  res.json({
    accountId,
    readyToProcessPayments,
    onboardingComplete,
    requirementsStatus: requirementsStatus || null,
  });
}));

// ── 9. Create a product on the connected account (Stripe-Account header) ─────
app.post('/api/accounts/:accountId/products', handle(async (req, res) => {
  const { accountId } = req.params;
  const { name, description, priceInCents, currency = 'usd' } = req.body;
  if (!name || !priceInCents) {
    return res.status(400).json({ error: 'name and priceInCents are required.' });
  }

  const product = await stripeClient.products.create(
    {
      name,
      description: description || undefined,
      default_price_data: {
        unit_amount: Number(priceInCents),
        currency,
      },
    },
    // The second argument is request options. `stripeAccount` sets the
    // Stripe-Account header so the product is created ON the connected account.
    { stripeAccount: accountId }
  );

  res.json({ productId: product.id });
}));

// ── 10. Storefront — one page per connected account ─────────────────────────
// NOTE: this demo puts the connected account id directly in the URL for
// simplicity. In a real app, map a friendly slug (e.g. /shop/acme) to the
// account id server-side so you never expose acct_… to customers.
app.get('/storefront/:accountId', handle(async (req, res) => {
  const { accountId } = req.params;

  const products = await stripeClient.products.list(
    {
      limit: 20,
      active: true,
      expand: ['data.default_price'],
    },
    { stripeAccount: accountId } // read products FROM the connected account
  );

  res.send(renderStorefront(accountId, products.data));
}));

// ── 11. Direct Charge checkout with an application fee ──────────────────────
// The session is created ON the connected account (Stripe-Account header), and
// the platform takes a cut via application_fee_amount.
app.post('/api/accounts/:accountId/checkout', handle(async (req, res) => {
  const { accountId } = req.params;
  const { priceId, unitAmount, quantity = 1 } = req.body;
  if (!priceId || !unitAmount) {
    return res.status(400).json({ error: 'priceId and unitAmount are required.' });
  }

  // Sample platform fee: 10% of the order total (in the smallest currency unit).
  const applicationFeeAmount = Math.round(Number(unitAmount) * Number(quantity) * 0.1);

  const session = await stripeClient.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [{ price: priceId, quantity: Number(quantity) }],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
      },
      success_url: `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/storefront/${accountId}`,
    },
    { stripeAccount: accountId } // Direct Charge: process on the connected account
  );

  res.json({ url: session.url });
}));

// ── 12. Subscribe the connected account to a PLATFORM subscription ──────────
// With V2 accounts the same id works for both customer and connected account, so
// we pass it as `customer_account`.
app.post('/api/accounts/:accountId/subscribe', handle(async (req, res) => {
  const { accountId } = req.params;

  if (!PLATFORM_SUBSCRIPTION_PRICE_ID) {
    // PLACEHOLDER: create a recurring Price on your PLATFORM account and set
    // PLATFORM_SUBSCRIPTION_PRICE_ID in .env.
    return res.status(400).json({
      error: 'PLATFORM_SUBSCRIPTION_PRICE_ID is not set. Create a recurring price on your platform account and add it to .env.',
    });
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: 'subscription',
    customer_account: accountId, // the connected account (acct_…) is the customer
    line_items: [{ price: PLATFORM_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
    success_url: `${APP_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_BASE_URL}/?accountId=${accountId}`,
  });

  res.json({ url: session.url });
}));

// ── 13. Billing portal so the account can manage its subscription ───────────
app.post('/api/accounts/:accountId/billing-portal', handle(async (req, res) => {
  const { accountId } = req.params;

  const session = await stripeClient.billingPortal.sessions.create({
    customer_account: accountId,
    return_url: `${APP_BASE_URL}/?accountId=${accountId}`,
  });

  res.json({ url: session.url });
}));

// ── 14. Tiny success/cancel pages ───────────────────────────────────────────
app.get('/success', (req, res) => {
  res.send(page('Payment complete', `
    <h1>✓ Success</h1>
    <p>Checkout session: <code>${escapeHtml(req.query.session_id || '')}</code></p>
    <p><a href="/">← Back to the dashboard</a></p>
  `));
});

app.listen(Number(PORT), () => {
  console.log(`\nStripe Connect sample running at ${APP_BASE_URL}`);
  console.log(`Dashboard:  ${APP_BASE_URL}/`);
  console.log(`Storefront: ${APP_BASE_URL}/storefront/<accountId>\n`);
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

function renderStorefront(accountId, products) {
  const cards = products.map((p) => {
    const price = p.default_price;
    const amount = price?.unit_amount;
    const currency = (price?.currency || 'usd').toUpperCase();
    const pretty = amount != null ? `$${(amount / 100).toFixed(2)} ${currency}` : '—';
    return `<article class="card">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="muted">${escapeHtml(p.description || '')}</p>
      <p class="price">${pretty}</p>
      <button data-price="${escapeHtml(price?.id || '')}" data-amount="${amount ?? ''}"
              ${price?.id ? '' : 'disabled'}>Buy</button>
    </article>`;
  }).join('') || '<p class="muted">This shop has no products yet.</p>';

  return page(`Storefront — ${accountId}`, `
    <h1>Storefront</h1>
    <p class="muted">Connected account <code>${escapeHtml(accountId)}</code></p>
    <div class="grid">${cards}</div>
    <script>
      document.querySelectorAll('button[data-price]').forEach((b) => {
        b.addEventListener('click', async () => {
          b.disabled = true; b.textContent = 'Redirecting…';
          const r = await fetch('/api/accounts/${encodeURIComponent(accountId)}/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId: b.dataset.price, unitAmount: b.dataset.amount, quantity: 1 }),
          });
          const data = await r.json();
          if (data.url) location.href = data.url;
          else { alert(data.error || 'Could not start checkout'); b.disabled = false; b.textContent = 'Buy'; }
        });
      });
    </script>
  `);
}

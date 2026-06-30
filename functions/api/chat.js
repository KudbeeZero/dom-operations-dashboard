// Cloudflare Pages Function — POST /api/chat
// Proxies the browser chat widget to the Claude Messages API, keeping the API key
// server-side. Streams the reply back as Server-Sent Events so the widget can render
// it token-by-token. Runs on the Cloudflare Workers runtime (fetch/Response/streams
// are built in — no SDK, no npm install, no build step).

import { KNOWLEDGE } from './_knowledge.js';

// --- Tunables -------------------------------------------------------------------
// Cheapest fast Claude tier; bump to 'claude-sonnet-4-6' for higher quality (pricier).
const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;          // cap on the reply length (bounds cost)
const MAX_TURNS = 10;             // only keep the last N messages of history
const MAX_CHARS_PER_MSG = 2000;   // reject absurdly long single messages
const RL_PER_MIN = 12;            // max requests per IP per minute
const RL_PER_DAY = 150;           // max requests per IP per day

// Browser Origins allowed to call this endpoint. A request whose Origin is present
// but not on this list is rejected (cheap defense; spoofable by non-browsers, but
// it stops naive cross-site abuse for free). Same-origin requests that omit Origin
// are allowed — the per-IP rate limiter still applies to them.
const ALLOWED_ORIGINS = [
  'https://igotadom.online',
  'https://www.igotadom.online',
];
const ALLOWED_ORIGIN_SUFFIX = '.dom-operations-dashboard.pages.dev'; // CF preview deploys

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function originAllowed(origin) {
  if (!origin) return true; // no Origin header → allow (rate limiter still gates it)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(ALLOWED_ORIGIN_SUFFIX);
  } catch {
    return false;
  }
}

// Per-IP fixed-window rate limit backed by Cloudflare KV (Workers isolates share no
// memory, so an in-memory counter can't work). Fails OPEN: if CHAT_KV isn't bound or
// KV errors, we allow the request so a setup gap or KV hiccup never takes the bot down.
async function rateLimited(env, ip) {
  const kv = env.CHAT_KV;
  if (!kv) {
    console.warn('[chat] CHAT_KV not bound — running without rate limiting.');
    return false;
  }
  if (!ip) return false;
  const now = Date.now();
  const minKey = `rl:m:${ip}:${Math.floor(now / 60000)}`;
  const dayKey = `rl:d:${ip}:${Math.floor(now / 86400000)}`;
  try {
    const [minRaw, dayRaw] = await Promise.all([kv.get(minKey), kv.get(dayKey)]);
    const minCount = parseInt(minRaw || '0', 10);
    const dayCount = parseInt(dayRaw || '0', 10);
    if (minCount >= RL_PER_MIN || dayCount >= RL_PER_DAY) return true;
    // Not over the limit — record this request. (KV has no atomic increment; a benign
    // read-modify-write race is acceptable at this scale.)
    await Promise.all([
      kv.put(minKey, String(minCount + 1), { expirationTtl: 60 }),
      kv.put(dayKey, String(dayCount + 1), { expirationTtl: 86400 }),
    ]);
    return false;
  } catch (err) {
    console.warn('[chat] KV rate-limit error — failing open:', err && err.message);
    return false;
  }
}

// Verify a Cloudflare Turnstile token (proves a real browser). Fails OPEN when
// TURNSTILE_SECRET isn't set (feature off) or when siteverify is unreachable — an
// explicit bad/forged token is the only thing that fails closed (403). So a setup
// gap or a network blip never takes the bot down, but a forged token is rejected.
async function turnstileOk(env, token, ip) {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return true; // not configured → skip
  if (!token) return false; // configured but no token → reject
  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = await r.json();
    return !!data.success;
  } catch (err) {
    console.warn('[chat] Turnstile verify error — failing open:', err && err.message);
    return true;
  }
}

export async function onRequestPost({ request, env }) {
  // 1. Fail fast with a clear message if the key isn't configured.
  //    PLACEHOLDER: set ANTHROPIC_API_KEY in the Cloudflare Pages dashboard
  //    (Settings → Environment variables, encrypted), then redeploy.
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('REPLACE_ME')) {
    return json(
      { error: 'The assistant isn’t set up yet. Text Dominick at 773-647-7598 and he’ll help you directly.' },
      503,
    );
  }

  // 1b. Only accept calls from our own site (cheap cross-site-abuse guard).
  if (!originAllowed(request.headers.get('Origin'))) {
    return json({ error: 'Not allowed.' }, 403);
  }

  // 1c. Per-IP rate limit (protects metered API spend). Fails open if KV isn't set up.
  const ip = request.headers.get('CF-Connecting-IP');
  if (await rateLimited(env, ip)) {
    return json(
      { error: 'You’re sending messages a little fast — give it a few seconds, or just text Dominick at 773-647-7598.' },
      429,
    );
  }

  // 2. Parse + validate the request body.
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  // 2b. Bot check (Cloudflare Turnstile). No-op until TURNSTILE_SECRET is set.
  if (!(await turnstileOk(env, body?.turnstileToken, ip))) {
    return json(
      { error: 'Couldn’t verify you’re human — refresh the page and try again, or text Dominick at 773-647-7598.' },
      403,
    );
  }

  let messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return json({ error: 'No message provided.' }, 400);
  }

  // Keep only well-formed user/assistant turns, trim each, keep the last MAX_TURNS.
  messages = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG) }))
    .slice(-MAX_TURNS);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return json({ error: 'No message provided.' }, 400);
  }

  // 3. Call the Claude Messages API with streaming. The big knowledge block is
  //    cached (cache_control: ephemeral) so repeat turns are cheap.
  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: [{ type: 'text', text: KNOWLEDGE, cache_control: { type: 'ephemeral' } }],
        messages,
      }),
    });
  } catch {
    return json({ error: 'Couldn’t reach the assistant. Text Dominick at 773-647-7598.' }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    // Don't leak upstream error details to the client.
    return json({ error: 'The assistant is busy right now. Text Dominick at 773-647-7598.' }, 502);
  }

  // 4. Stream the SSE straight back to the browser.
  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

// With only onRequestPost defined, Cloudflare Pages returns 405 for other methods automatically.

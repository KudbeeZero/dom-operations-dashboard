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

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

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

  // 2. Parse + validate the request body.
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
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

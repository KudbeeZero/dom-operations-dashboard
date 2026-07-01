// Blocks public access to the HERMES vault (internal notes, decisions, legal drafts).
// Cloudflare Pages Functions run before static assets, so this shadows every
// /vault/* URL with a 404 while the files stay in the repo (never-delete rule).
export function onRequest() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

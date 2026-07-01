// Blocks public access to CLAUDE.md (internal working rules for this repo).
// Route: /CLAUDE.md — Pages strips the .js extension when mapping the route.
export function onRequest() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

// Blocks public access to the standalone Stripe Connect sample app's source.
// The sample is a local-dev reference only (see stripe-connect-sample/README.md);
// it is not part of the marketing site and shouldn't be downloadable from it.
export function onRequest() {
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

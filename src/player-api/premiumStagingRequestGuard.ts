/** Additional CSRF boundary for cookie-authorized staging mutations. */
export function isSafePremiumStagingMutation(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  // Browsers send Origin on same-origin fetch POST. Older clients may omit it;
  // a declared foreign origin or cross-site browser navigation is never accepted.
  if (origin !== null && origin !== url.origin) return false;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  return true;
}

export function premiumStagingForbidden(): Response {
  return new Response(JSON.stringify({ error: 'CROSS_ORIGIN_STAGING_MUTATION' }), {
    status: 403,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
  });
}

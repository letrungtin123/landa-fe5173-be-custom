// Server-side helpers shared by server.js and vite.config.ts (never bundled
// into the browser app).

/**
 * Appends the address of the peer that connected to this server to an
 * existing X-Forwarded-For value. The backend trusts only known proxy hops
 * (TRUSTED_PROXY_CIDRS), so the entry appended here is the real client
 * address when the browser connects directly, and anything a client typed
 * into the header itself stays to the left of it.
 *
 * @param {string | string[] | undefined} existing
 * @param {string | undefined} peerAddress
 * @returns {string | undefined}
 */
export function appendForwardedFor(existing, peerAddress) {
  const previous = (Array.isArray(existing) ? existing.join(", ") : String(existing || "")).trim();
  const peer = String(peerAddress || "").trim();
  if (!peer) return previous || undefined;
  return previous ? `${previous}, ${peer}` : peer;
}

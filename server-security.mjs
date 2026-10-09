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

/**
 * Pages other sites may show in a frame, exactly as today: the demo embed,
 * the demo QR sign-in, and the sign-in page a demo frame falls back to when
 * its session ends. Override with LEARNER_FRAMEABLE_PATHS (comma-separated,
 * server-side only).
 */
export const DEFAULT_FRAMEABLE_PATHS = Object.freeze(["/demo-embed", "/demo-login", "/login"]);

/** @param {string | undefined} raw */
export function parseFrameablePaths(raw) {
  if (raw === undefined || raw.trim() === "") return [...DEFAULT_FRAMEABLE_PATHS];
  return raw.split(",").map((value) => value.trim()).filter((value) => value.startsWith("/"));
}

/**
 * @param {string} pathname
 * @param {readonly string[]} frameablePaths
 */
export function isFrameablePath(pathname, frameablePaths) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return frameablePaths.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
}

/**
 * Security headers for every response of the learner web server.
 * - nosniff and a referrer policy everywhere;
 * - framing only by this site, except the demo pages listed above (which
 *   keep today's "any site may frame" behaviour);
 * - no Strict-Transport-Security: customers still use http:// addresses.
 * A full Content-Security-Policy is intentionally not sent: index.html runs
 * an inline branding script and loads Google Fonts, and API/storage/SSO
 * origins differ per deployment, so only frame-ancestors is enforced.
 *
 * @param {string} pathname
 * @param {readonly string[]} [frameablePaths]
 * @returns {Record<string, string>}
 */
export function securityHeadersFor(pathname, frameablePaths = DEFAULT_FRAMEABLE_PATHS) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
  if (isFrameablePath(pathname, frameablePaths)) return headers;
  return {
    ...headers,
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "frame-ancestors 'self'",
  };
}

/** Pathname of a request URL ("/a/b?x" -> "/a/b"). @param {string | undefined} url */
export function requestPathname(url) {
  try {
    return new URL(url || "/", "http://localhost").pathname;
  } catch {
    return "/";
  }
}

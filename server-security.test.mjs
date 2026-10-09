import assert from "node:assert/strict";
import test from "node:test";
import { appendForwardedFor } from "./server-security.mjs";

test("appends the connecting peer after any client-supplied forwarded addresses", () => {
  assert.equal(appendForwardedFor(undefined, "203.0.113.7"), "203.0.113.7");
  assert.equal(appendForwardedFor("1.2.3.4", "203.0.113.7"), "1.2.3.4, 203.0.113.7");
  assert.equal(appendForwardedFor(["1.2.3.4", "5.6.7.8"], "::ffff:203.0.113.7"), "1.2.3.4, 5.6.7.8, ::ffff:203.0.113.7");
});

test("keeps the existing value when the peer address is unknown", () => {
  assert.equal(appendForwardedFor("1.2.3.4", undefined), "1.2.3.4");
  assert.equal(appendForwardedFor(undefined, ""), undefined);
});

test("learner pages may be framed only by this site; demo pages keep any-site framing", async () => {
  const { securityHeadersFor, parseFrameablePaths, requestPathname } = await import("./server-security.mjs");
  for (const path of ["/", "/dashboard", "/courses/abc/learn", "/assets/index.js", "/api/auth/me"]) {
    const headers = securityHeadersFor(path);
    assert.equal(headers["X-Frame-Options"], "SAMEORIGIN", path);
    assert.equal(headers["Content-Security-Policy"], "frame-ancestors 'self'", path);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
    assert.equal(headers["Strict-Transport-Security"], undefined);
  }
  for (const path of ["/demo-embed", "/demo-embed/", "/demo-login", "/login"]) {
    const headers = securityHeadersFor(path);
    assert.equal(headers["X-Frame-Options"], undefined, path);
    assert.equal(headers["Content-Security-Policy"], undefined, path);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
  }
  assert.equal(securityHeadersFor("/demo-embedded")["X-Frame-Options"], "SAMEORIGIN");
  assert.deepEqual(parseFrameablePaths(" /demo-embed , nope ,/x "), ["/demo-embed", "/x"]);
  assert.equal(requestPathname("/demo-embed?code=abc"), "/demo-embed");
});

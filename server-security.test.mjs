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

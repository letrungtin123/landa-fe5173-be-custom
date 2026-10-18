import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { learnerServeOptions } from "./serve-dist.options.mjs";
import { securityHeadersFor } from "./server-security.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

test("serve-dist uses the vite preview settings: /api target order, allowed hosts, port, framing rules", () => {
  const options = learnerServeOptions({ VITE_PROXY_TARGET: "http://localhost:3101", VITE_API_BASE_URL: "", VITE_ALLOWED_HOSTS: "a.example.com", VITE_PREVIEW_PORT: "5999" }, ["node", "serve-dist.mjs"]);
  assert.equal(options.basePath, "/");
  assert.deepEqual(options.proxyPrefixes, ["/api"]);
  assert.equal(options.backendUrl, "http://localhost:3101");
  assert.equal(options.rejectUnauthorizedBackend, false);
  assert.deepEqual(options.allowedHosts, ["a.example.com"]);
  assert.equal(options.host, "0.0.0.0");
  assert.equal(options.port, 5999);
  assert.equal(options.distDir, path.join(root, "dist"));
  for (const pathname of ["/", "/login", "/demo-embed", "/assets/x.js"]) {
    assert.deepEqual(options.securityHeaders(pathname), securityHeadersFor(pathname), pathname);
  }
  assert.equal(learnerServeOptions({ PROXY_BACKEND_URL: "http://p:1", VITE_PROXY_TARGET: "http://t:2" }, []).backendUrl, "http://p:1");
  assert.equal(learnerServeOptions({ LEARNER_FRAMEABLE_PATHS: "/only" }, []).securityHeaders("/login")["X-Frame-Options"], "SAMEORIGIN");
});

test("PM2 arguments win over .env, defaults match vite.config.ts", () => {
  const options = learnerServeOptions({ VITE_PREVIEW_PORT: "5999" }, ["node", "serve-dist.mjs", "--host", "127.0.0.1", "--port", "5273"]);
  assert.equal(options.port, 5273);
  assert.equal(options.host, "127.0.0.1");
  const defaults = learnerServeOptions({}, []);
  assert.equal(defaults.backendUrl, "http://localhost:3001");
  assert.equal(defaults.port, 5173);
});

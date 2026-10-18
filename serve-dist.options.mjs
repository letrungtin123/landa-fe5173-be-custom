// Settings of serve-dist.mjs, from the same values vite.config.ts gives
// `vite preview`: /api to PROXY_BACKEND_URL || VITE_PROXY_TARGET ||
// VITE_API_BASE_URL (default http://localhost:3001, TLS not verified like
// `secure: false`), VITE_ALLOWED_HOSTS, preview host 0.0.0.0 and
// VITE_PREVIEW_PORT (default 5173), server-security.mjs framing rules with
// LEARNER_FRAMEABLE_PATHS.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAllowedHosts } from "./dist-server.mjs";
import { parseFrameablePaths, securityHeadersFor } from "./server-security.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @param {readonly string[]} argv @param {string} name */
function argument(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

/**
 * @param {Record<string, string>} env  loadProductionEnv(rootDir)
 * @param {readonly string[]} argv      process.argv (--host, --port, --dist)
 */
export function learnerServeOptions(env, argv) {
  const frameablePaths = parseFrameablePaths(env.LEARNER_FRAMEABLE_PATHS);
  return {
    name: "landa-learner",
    distDir: path.resolve(argument(argv, "--dist") || path.join(rootDir, "dist")),
    basePath: "/",
    proxyPrefixes: ["/api"],
    backendUrl: env.PROXY_BACKEND_URL || env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || "http://localhost:3001",
    allowedHosts: parseAllowedHosts(env.VITE_ALLOWED_HOSTS),
    securityHeaders: (/** @type {string} */ pathname) => securityHeadersFor(pathname, frameablePaths),
    rejectUnauthorizedBackend: false,
    host: argument(argv, "--host") || "0.0.0.0",
    port: Number(argument(argv, "--port") || env.VITE_PREVIEW_PORT) || 5173,
  };
}

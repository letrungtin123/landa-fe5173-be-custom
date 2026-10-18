// Production server for the learner build (dist/), in place of `vite preview`.
// Same settings vite preview reads in vite.config.ts: PROXY_BACKEND_URL ||
// VITE_PROXY_TARGET || VITE_API_BASE_URL (/api), VITE_ALLOWED_HOSTS,
// VITE_PREVIEW_PORT, LEARNER_FRAMEABLE_PATHS, from .env, .env.local,
// .env.production, .env.production.local and the process environment. Same
// security headers and framing rules (server-security.mjs).
//
//   node serve-dist.mjs --host 0.0.0.0 --port 5273 [--dist <build folder>]
//
// Adds what vite preview lacks: hashed /assets/* cached for a year
// (immutable), index.html and /fonts revalidated (no-cache + ETag, 304),
// brotli/gzip compressed once and kept in memory, compressed /api JSON,
// streaming proxy. (server.js, the older server, buffers request bodies and
// keeps index.html in memory until restart.)

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadProductionEnv, parseAllowedHosts, startDistServer } from "./dist-server.mjs";
import { parseFrameablePaths, securityHeadersFor } from "./server-security.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** @param {string} name */
function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const env = await loadProductionEnv(rootDir);
const frameablePaths = parseFrameablePaths(env.LEARNER_FRAMEABLE_PATHS);

startDistServer({
  name: "landa-learner",
  distDir: path.resolve(argument("--dist") || path.join(rootDir, "dist")),
  basePath: "/",
  proxyPrefixes: ["/api"],
  backendUrl: env.PROXY_BACKEND_URL || env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || "http://localhost:3001",
  allowedHosts: parseAllowedHosts(env.VITE_ALLOWED_HOSTS),
  securityHeaders: (pathname) => securityHeadersFor(pathname, frameablePaths),
  // vite.config.ts proxy: secure: false.
  rejectUnauthorizedBackend: false,
  host: argument("--host") || "0.0.0.0",
  port: Number(argument("--port") || env.VITE_PREVIEW_PORT) || 5173,
});

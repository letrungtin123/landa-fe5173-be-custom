// Production server for the learner build (dist/), in place of `vite preview`.
// Same settings vite preview reads in vite.config.ts (serve-dist.options.mjs),
// from .env, .env.local, .env.production, .env.production.local and the
// process environment; same security headers and framing rules.
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
import { loadProductionEnv, startDistServer } from "./dist-server.mjs";
import { learnerServeOptions } from "./serve-dist.options.mjs";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

startDistServer(learnerServeOptions(await loadProductionEnv(rootDir), process.argv));

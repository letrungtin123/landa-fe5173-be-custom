/**
 * Production server for FE-5173
 * - Serves static files from dist/
 * - Proxies LMS API requests to internal LMS backend
 * - Handles SPA routing (fallback to index.html)
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST_DIR = join(__dirname, "dist");
const PORT = parseInt(process.env.PORT || "5173", 10);

// LMS backend — Caddy internal HTTP (Tutor)
const LMS_BACKEND = process.env.LMS_BACKEND || "http://192.168.0.226.nip.io";

// Paths that should be proxied to LMS
const LMS_PROXY_PATHS = [
  "/oauth2/",
  "/login_ajax",
  "/logout",
  "/csrf/",
  "/api/",
  "/user_api/",
  "/xblock/",
  "/courses/",
  "/enrollment",
  "/search/",
  "/media/",
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

function shouldProxy(pathname) {
  // /courses/ URLs — chỉ proxy khi chứa /xblock/ (LMS API calls),
  // các URL khác như /courses/{id}/lessons/... là SPA routes → không proxy.
  // Logic giống với bypass trong vite.config.ts (dev mode).
  if (pathname.startsWith("/courses/")) {
    return pathname.includes("/xblock/");
  }
  return LMS_PROXY_PATHS.some((prefix) => pathname.startsWith(prefix));
}

async function proxyToLms(req, res) {
  const targetUrl = `${LMS_BACKEND}${req.url}`;

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);

  // Build headers — forward most, adjust host
  const headers = { ...req.headers };
  const lmsHost = new URL(LMS_BACKEND).host;
  headers.host = lmsHost;
  // Remove encoding to simplify response handling
  delete headers["accept-encoding"];

  try {
    const proxyRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body,
      redirect: "manual",
    });

    // Forward status and headers
    const resHeaders = {};
    proxyRes.headers.forEach((value, key) => {
      // Skip transfer-encoding since we send complete body
      if (key.toLowerCase() === "transfer-encoding") return;
      resHeaders[key] = value;
    });

    res.writeHead(proxyRes.status, resHeaders);
    const resBody = Buffer.from(await proxyRes.arrayBuffer());
    res.end(resBody);
  } catch (err) {
    console.error(`[proxy] Error proxying ${req.method} ${req.url}:`, err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Bad Gateway", detail: err.message }));
  }
}

function serveStatic(req, res) {
  let pathname = new URL(req.url, "http://localhost").pathname;

  // Try exact file first
  let filePath = join(DIST_DIR, pathname);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const content = readFileSync(filePath);

    const cacheControl =
      pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";

    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": content.length,
      "Cache-Control": cacheControl,
    });
    res.end(content);
    return;
  }

  // SPA fallback — serve index.html
  const indexPath = join(DIST_DIR, "index.html");
  if (existsSync(indexPath)) {
    const content = readFileSync(indexPath);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": content.length,
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (shouldProxy(pathname)) {
    proxyToLms(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[FE-5173] Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[FE-5173] LMS backend: ${LMS_BACKEND}`);
  console.log(`[FE-5173] Proxying: ${LMS_PROXY_PATHS.join(", ")}`);
});

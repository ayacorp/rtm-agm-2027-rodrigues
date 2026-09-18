"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const root = path.join(__dirname, "..");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === "#") return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"')
      || (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  });
}

loadEnv(path.join(root, ".env.local"));
loadEnv(path.join(root, ".env"));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const routes = {
  "/api/reserve": "../api/reserve.js",
  "/api/config": "../api/config.js",
  "/api/booking/paid": "../api/booking/paid.js",
  "/api/booking/proof": "../api/booking/proof.js",
  "/api/admin/bookings": "../api/admin/bookings.js",
};

function send(res, status, type, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  res.end(body);
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root)) {
    send(res, 403, "text/plain", "Forbidden");
    return;
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      const fallback = path.join(root, "404.html");
      fs.readFile(fallback, function (missing, page) {
        send(res, 404, "text/html; charset=utf-8", page || "Not found");
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", TYPES[ext] || "application/octet-stream");
    res.end(data);
  });
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const api = routes[url.pathname];
  if (api) {
    const handler = require(api);
    Promise.resolve(handler(req, res)).catch(function (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, "application/json", JSON.stringify({ ok: false, error: "Server error" }));
    });
    return;
  }
  serveStatic(req, res, url);
});

const port = Number(process.env.PORT || 4173);
server.listen(port, "127.0.0.1", function () {
  console.log("RTM AGM 2027 local server → http://127.0.0.1:" + port);
  console.log("Store driver:", process.env.STORE_DRIVER || "(auto)");
  if (!process.env.POSTGRES_URL && !process.env.KV_REST_API_URL && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("No production store env — using local data/bookings.json (not for production).");
  }
});

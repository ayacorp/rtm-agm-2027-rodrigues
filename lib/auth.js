"use strict";

const { URL } = require("url");
const { fail } = require("./http");

function readBearer(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!header) return "";
  const match = /^Bearer\s+(.+)$/i.exec(String(header));
  return match ? match[1].trim() : "";
}

function readQueryToken(req) {
  if (req.query && req.query.token) return String(req.query.token);
  try {
    const url = new URL(req.url, "http://localhost");
    return url.searchParams.get("token") || "";
  } catch (err) {
    return "";
  }
}

function requireAdmin(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    fail(503, "ADMIN_TOKEN is not configured");
  }
  const provided = readBearer(req) || readQueryToken(req);
  if (!provided || provided !== token) {
    fail(401, "Unauthorized");
  }
}

module.exports = {
  readBearer,
  requireAdmin,
};

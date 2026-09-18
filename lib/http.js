"use strict";

function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string" && req.body) {
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch (err) {
      return Promise.reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
    }
  }
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (chunk) {
      chunks.push(chunk);
    });
    req.on("end", function () {
      if (!chunks.length) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function methodNotAllowed(res, allow) {
  res.setHeader("Allow", allow);
  sendJson(res, 405, { ok: false, error: "Method not allowed" });
}

function handleError(res, err) {
  const status = err && err.statusCode ? err.statusCode : 500;
  const message = status >= 500
    ? "Server error"
    : (err && err.message) || "Request failed";
  if (status >= 500) {
    console.error("[rtm-booking]", err);
  }
  sendJson(res, status, { ok: false, error: message });
}

function wrap(handler) {
  return async function (req, res) {
    try {
      await handler(req, res);
    } catch (err) {
      handleError(res, err);
    }
  };
}

function fail(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

module.exports = {
  readJsonBody,
  sendJson,
  methodNotAllowed,
  handleError,
  wrap,
  fail,
};

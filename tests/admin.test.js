"use strict";

process.env.NODE_ENV = "test";
process.env.STORE_DRIVER = "memory";
process.env.ADMIN_TOKEN = "test-admin-token";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const { resetStoreForTests } = require("../lib/store");
const { createReservation } = require("../api/reserve");
const admin = require("../api/admin/bookings");

function request(handler, method, headers, body) {
  return new Promise(function (resolve, reject) {
    const server = http.createServer(function (req, res) {
      Promise.resolve(handler(req, res)).catch(reject);
    });
    server.listen(0, "127.0.0.1", function () {
      const port = server.address().port;
      const req = http.request({
        hostname: "127.0.0.1",
        port: port,
        path: "/api/admin/bookings",
        method: method,
        headers: Object.assign({ "content-type": "application/json" }, headers || {}),
      }, function (res) {
        const chunks = [];
        res.on("data", function (chunk) { chunks.push(chunk); });
        res.on("end", function () {
          server.close();
          const raw = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode,
            body: raw ? JSON.parse(raw) : {},
          });
        });
      });
      req.on("error", function (err) {
        server.close();
        reject(err);
      });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

test("admin list rejects missing token and marks paid", async function () {
  resetStoreForTests();
  const created = await createReservation({
    name: "Isha Nair",
    email: "isha@example.com",
    roomType: "share",
  });

  const denied = await request(admin, "GET", {}, null);
  assert.equal(denied.status, 401);

  const listed = await request(admin, "GET", {
    authorization: "Bearer test-admin-token",
  }, null);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.bookings.length, 1);
  assert.equal(listed.body.bookings[0].ref, created.reservation.ref);

  const marked = await request(admin, "PATCH", {
    authorization: "Bearer test-admin-token",
  }, { ref: created.reservation.ref, status: "paid" });
  assert.equal(marked.status, 200);
  assert.equal(marked.body.reservation.status, "paid");
});

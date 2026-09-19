"use strict";

const { wrap, sendJson, methodNotAllowed, readJsonBody, fail } = require("../../lib/http");
const { requireAdmin } = require("../../lib/auth");
const { getStore, storeInfo, STATUSES, assertStatus } = require("../../lib/store");

module.exports = wrap(async function adminBookings(req, res) {
  requireAdmin(req);

  if (req.method === "GET") {
    const rows = await getStore().list();
    sendJson(res, 200, {
      ok: true,
      bookings: rows,
      store: storeInfo(),
      statuses: STATUSES,
    });
    return;
  }

  if (req.method === "PATCH" || req.method === "POST") {
    const body = await readJsonBody(req);
    const ref = String((body && body.ref) || "").trim().toUpperCase();
    const status = String((body && body.status) || "paid").trim();
    if (!ref) fail(400, "ref is required");
    assertStatus(status);
    const updated = await getStore().update(ref, { status: status });
    if (!updated) fail(404, "Reservation not found");
    sendJson(res, 200, { ok: true, reservation: updated, store: storeInfo() });
    return;
  }

  methodNotAllowed(res, "GET, PATCH, POST");
});

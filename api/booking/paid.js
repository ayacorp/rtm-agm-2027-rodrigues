"use strict";

const { wrap, sendJson, methodNotAllowed, readJsonBody, fail } = require("../../lib/http");
const { isValidRef } = require("../../lib/refs");
const { getStore, storeInfo } = require("../../lib/store");
const { notifyBooking } = require("../../lib/notify");
const { publicBank } = require("../../lib/bank");

async function markPaidClaim(body) {
  const ref = String((body && body.ref) || "").trim().toUpperCase();
  const email = String((body && body.email) || "").trim().toLowerCase();
  if (!isValidRef(ref) && !/^RTM27-/.test(ref)) fail(400, "A valid booking reference is required");
  if (!email) fail(400, "Email is required to confirm this booking");

  const store = getStore();
  const reservation = await store.get(ref);
  if (!reservation || reservation.email !== email) {
    fail(404, "No matching reservation for that reference and email");
  }
  if (reservation.status === "paid") {
    return { reservation: reservation, already: true };
  }

  const updated = await store.update(ref, { status: "awaiting_verification" });
  const notify = await notifyBooking("paid_claimed", updated);
  if (notify.queued) {
    await store.update(ref, { notifyQueued: true, notifyLog: notify.channel });
    updated.notifyQueued = true;
  }
  return { reservation: updated, already: false, notify: notify };
}

module.exports = wrap(async function paid(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  const body = await readJsonBody(req);
  const result = await markPaidClaim(body);
  sendJson(res, 200, {
    ok: true,
    reservation: result.reservation,
    bank: publicBank(),
    store: storeInfo(),
    notify: result.notify
      ? { sent: result.notify.sent, queued: result.notify.queued, channel: result.notify.channel }
      : { sent: false, queued: false, channel: "none" },
  });
});

module.exports.markPaidClaim = markPaidClaim;

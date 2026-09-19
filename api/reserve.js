"use strict";

const { wrap, sendJson, methodNotAllowed, readJsonBody, fail } = require("../lib/http");
const { computeQuote } = require("../lib/pricing");
const { allocateRef } = require("../lib/refs");
const { publicBank } = require("../lib/bank");
const { getStore, storeInfo, nowIso } = require("../lib/store");
const { notifyBooking } = require("../lib/notify");

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

async function createReservation(body) {
  const name = String((body && body.name) || "").trim();
  const email = String((body && body.email) || "").trim().toLowerCase();
  const phone = String((body && body.phone) || "").trim();
  if (!name) fail(400, "Name is required");
  if (!isEmail(email)) fail(400, "A valid email is required");

  const quote = computeQuote({
    roomType: body && body.roomType,
    kids: body && body.kids,
  });

  const store = getStore();
  const ref = await allocateRef(name, function (candidate) {
    return store.exists(candidate);
  });

  const reservation = {
    ref: ref,
    name: name,
    email: email,
    phone: phone,
    table: String((body && body.table) || "").trim(),
    companions: String((body && body.companions) || "").trim(),
    notes: String((body && body.notes) || "").trim(),
    roomType: quote.roomType,
    kids: quote.kids,
    total: quote.total,
    currency: quote.currency,
    status: "pending_payment",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    proofUrl: "",
    notifyQueued: false,
    notifyLog: "",
  };

  await store.create(reservation);
  const notify = await notifyBooking("reserved", reservation);
  if (notify.queued) {
    await store.update(ref, { notifyQueued: true, notifyLog: notify.channel });
    reservation.notifyQueued = true;
    reservation.notifyLog = notify.channel;
  }

  return {
    reservation: reservation,
    quote: quote,
    notify: notify,
  };
}

module.exports = wrap(async function reserve(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  const body = await readJsonBody(req);
  const created = await createReservation(body);
  sendJson(res, 201, {
    ok: true,
    reservation: created.reservation,
    quote: created.quote,
    bank: publicBank(),
    store: storeInfo(),
    notify: {
      sent: created.notify.sent,
      queued: created.notify.queued,
      channel: created.notify.channel,
    },
  });
});

module.exports.createReservation = createReservation;

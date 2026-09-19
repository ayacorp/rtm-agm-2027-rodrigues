"use strict";

const { wrap, sendJson, methodNotAllowed, fail } = require("../../lib/http");
const { isValidRef } = require("../../lib/refs");
const { getStore, storeInfo } = require("../../lib/store");
const { notifyBooking } = require("../../lib/notify");
const { publicBank } = require("../../lib/bank");
const { parseMultipart } = require("../../lib/multipart");
const { uploadProof } = require("../../lib/proof");

async function submitProof(fields, file) {
  const ref = String((fields && fields.ref) || "").trim().toUpperCase();
  const email = String((fields && fields.email) || "").trim().toLowerCase();
  if (!isValidRef(ref) && !/^RTM27-/.test(ref)) fail(400, "A valid booking reference is required");
  if (!email) fail(400, "Email is required to confirm this booking");

  const store = getStore();
  const reservation = await store.get(ref);
  if (!reservation || reservation.email !== email) {
    fail(404, "No matching reservation for that reference and email");
  }

  const url = await uploadProof(ref, file);
  const status = reservation.status === "paid" ? "paid" : "awaiting_verification";
  const updated = await store.update(ref, { proofUrl: url, status: status });
  const notify = await notifyBooking("proof_received", updated);
  if (notify.queued) {
    await store.update(ref, { notifyQueued: true, notifyLog: notify.channel });
    updated.notifyQueued = true;
    updated.notifyLog = notify.channel;
  }

  return { reservation: updated, notify: notify };
}

module.exports = wrap(async function proof(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  const parsed = await parseMultipart(req);
  const result = await submitProof(parsed.fields, parsed.file);
  sendJson(res, 200, {
    ok: true,
    reservation: result.reservation,
    bank: publicBank(),
    store: storeInfo(),
    notify: {
      sent: result.notify.sent,
      queued: result.notify.queued,
      channel: result.notify.channel,
    },
  });
});

module.exports.config = {
  api: { bodyParser: false },
};

module.exports.submitProof = submitProof;

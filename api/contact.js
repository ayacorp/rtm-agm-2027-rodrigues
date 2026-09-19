"use strict";

const { wrap, sendJson, methodNotAllowed, readJsonBody, fail } = require("../lib/http");
const { notifyContact } = require("../lib/notify");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseContact(body) {
  const name = String((body && body.name) || "").trim();
  const email = String((body && body.email) || "").trim().toLowerCase();
  const message = String((body && body.message) || "").trim();
  if (!name) fail(400, "Name is required");
  if (name.length > 120) fail(400, "Name is too long");
  if (!EMAIL_RE.test(email)) fail(400, "A valid email is required");
  if (!message) fail(400, "A message is required");
  if (message.length > 4000) fail(400, "Message is too long");
  return { name: name, email: email, message: message };
}

async function sendContact(body) {
  const input = parseContact(body);
  const notify = await notifyContact(input);
  if (!notify.sent) {
    fail(503, "Could not send just now. Please try again shortly.");
  }
  return { ok: true, notify: notify };
}

module.exports = wrap(async function contact(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method !== "POST") {
    methodNotAllowed(res, "POST");
    return;
  }
  const body = await readJsonBody(req);
  const result = await sendContact(body);
  sendJson(res, 200, {
    ok: true,
    notify: {
      sent: result.notify.sent,
      channel: result.notify.channel,
    },
  });
});

module.exports.sendContact = sendContact;
module.exports.parseContact = parseContact;

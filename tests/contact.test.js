"use strict";

process.env.NODE_ENV = "test";
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;
delete process.env.SMTP_HOST;
delete process.env.BOOKING_NOTIFY_EMAIL;

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseContact, sendContact } = require("../api/contact");
const { buildContactEmail } = require("../lib/email-templates");
const { notifyContact, defaultFrom, DEFAULT_FROM } = require("../lib/notify");
const { notifyEmail } = require("../lib/bank");

test("parseContact requires name, a valid email, and a message", function () {
  assert.throws(function () { parseContact({}); }, /Name is required/);
  assert.throws(function () { parseContact({ name: "Alex" }); }, /valid email/);
  assert.throws(function () { parseContact({ name: "Alex", email: "not-an-email" }); }, /valid email/);
  assert.throws(function () { parseContact({ name: "Alex", email: "alex@example.com" }); }, /message is required/i);
  assert.throws(function () { parseContact({ name: "Alex", email: "alex@example.com", message: "   " }); }, /message is required/i);
  const parsed = parseContact({
    name: "  Alex Morel  ",
    email: "Alex@Example.COM",
    message: " Can kids share? ",
  });
  assert.deepEqual(parsed, {
    name: "Alex Morel",
    email: "alex@example.com",
    message: "Can kids share?",
  });
});

test("buildContactEmail goes to ishant@ayacorp.io with visitor Reply-To", function () {
  assert.equal(notifyEmail(), "ishant@ayacorp.io");
  const mail = buildContactEmail({
    name: "Alex Morel",
    email: "alex@example.com",
    message: "Can kids share?",
  });
  assert.equal(mail.to, "ishant@ayacorp.io");
  assert.equal(mail.replyTo, "alex@example.com");
  assert.equal(mail.kind, "contact");
  assert.match(mail.subject, /Contact from Alex Morel/);
  assert.match(mail.text, /Can kids share\?/);
  assert.match(mail.html, /alex@example.com/);
  assert.match(mail.html, /Can kids share\?/);
});

test("RESEND_FROM for contact stays bookings@friday.mu", function () {
  delete process.env.RESEND_FROM;
  assert.equal(DEFAULT_FROM, "RTM AGM 2027 <bookings@friday.mu>");
  assert.equal(defaultFrom(), "RTM AGM 2027 <bookings@friday.mu>");
});

test("notifyContact without transport fails instead of queueing as success", async function () {
  const result = await notifyContact({
    name: "Alex Morel",
    email: "alex@example.com",
    message: "Hello",
  });
  assert.equal(result.sent, false);
  assert.equal(result.queued, false);
  assert.equal(result.channel, "unavailable");
});

test("sendContact returns 503 when mail cannot send", async function () {
  try {
    await sendContact({
      name: "Alex Morel",
      email: "alex@example.com",
      message: "Hello",
    });
    assert.fail("expected 503");
  } catch (err) {
    assert.equal(err.statusCode, 503);
    assert.match(err.message, /Could not send/);
  }
});

test("notifyContact sends via Resend from bookings@friday.mu to ishant@ayacorp.io", async function () {
  const prevFetch = global.fetch;
  const payloads = [];
  process.env.RESEND_API_KEY = "re_test_key";
  delete process.env.RESEND_FROM;
  global.fetch = async function (url, options) {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer re_test_key");
    payloads.push(JSON.parse(options.body));
    return { ok: true, text: async function () { return "{}"; } };
  };
  try {
    const result = await notifyContact({
      name: "Alex Morel",
      email: "alex@example.com",
      message: "Hello from the site",
    });
    assert.equal(result.sent, true);
    assert.equal(result.channel, "resend");
    assert.equal(result.queued, false);
    assert.equal(payloads.length, 1);
    assert.equal(payloads[0].from, "RTM AGM 2027 <bookings@friday.mu>");
    assert.equal(payloads[0].to[0], "ishant@ayacorp.io");
    assert.equal(payloads[0].reply_to, "alex@example.com");
    assert.match(payloads[0].subject, /Contact from Alex Morel/);
    assert.match(payloads[0].html, /Hello from the site/);
  } finally {
    delete process.env.RESEND_API_KEY;
    global.fetch = prevFetch;
  }
});

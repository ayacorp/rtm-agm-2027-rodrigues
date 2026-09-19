"use strict";

process.env.NODE_ENV = "test";
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;
delete process.env.SMTP_HOST;
delete process.env.PUBLIC_SITE_URL;
delete process.env.BANK_DETAILS_PUBLIC;

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { publicBank, TBA_MESSAGE } = require("../lib/bank");
const {
  buildGuestEmail,
  buildTreasurerEmail,
  bankRows,
} = require("../lib/email-templates");
const { defaultFrom, DEFAULT_FROM, notifyBooking, buildMessages } = require("../lib/notify");

const sample = {
  ref: "RTM27-MOREL-1842",
  name: "Alex Morel",
  email: "alex@example.com",
  phone: "59061912",
  table: "RT9",
  companions: "Partner",
  roomType: "partner",
  kids: 1,
  total: 65200,
  status: "pending_payment",
  createdAt: "2026-09-19T10:00:00.000Z",
  proofUrl: "",
};

function restoreBankEnv() {
  delete process.env.BANK_DETAILS_PUBLIC;
}

test("RESEND_FROM defaults to bookings@friday.mu", function () {
  delete process.env.RESEND_FROM;
  assert.equal(defaultFrom(), "RTM AGM 2027 <bookings@friday.mu>");
  assert.equal(DEFAULT_FROM, "RTM AGM 2027 <bookings@friday.mu>");
  process.env.RESEND_FROM = "RTM AGM 2027 <bookings@friday.mu>";
  assert.equal(defaultFrom(), "RTM AGM 2027 <bookings@friday.mu>");
  delete process.env.RESEND_FROM;
});

test("guest and treasurer emails are HTML + text with the booking ref", function () {
  ["reserved", "paid_claimed", "proof_received"].forEach(function (kind) {
    const guest = buildGuestEmail(kind, sample);
    const treasurer = buildTreasurerEmail(kind, sample, { to: "ishant@ayacorp.io" });
    assert.match(guest.html, /<!DOCTYPE html>/);
    assert.match(treasurer.html, /<!DOCTYPE html>/);
    assert.match(guest.text, /RTM27-MOREL-1842/);
    assert.match(treasurer.text, /RTM27-MOREL-1842/);
    assert.match(guest.html, /RTM27-MOREL-1842/);
    assert.match(guest.html, /Return to the booking site|Open the booking site/);
    assert.match(guest.html, /https:\/\/rtm-agm-2027-rodrigues\.vercel\.app\/#reserve/);
    assert.match(treasurer.html, /Treasurer notify/);
    assert.ok(guest.text.length > 40);
    assert.ok(treasurer.text.length > 40);
  });
});

test("bank block uses publicBank helpers and locked MCB strings", function () {
  restoreBankEnv();
  const bank = publicBank();
  const rows = bankRows(bank);
  const guest = buildGuestEmail("reserved", sample);
  assert.equal(bank.beneficiaryName, "Mauritius Round Table No. 9");
  assert.equal(bank.accountNumber, "000443540438");
  rows.forEach(function (row) {
    assert.ok(guest.html.includes(row.v), "html missing " + row.k);
    assert.ok(guest.text.includes(row.v), "text missing " + row.k);
  });
  assert.match(guest.html, /Mauritius Round Table No\. 9/);
  assert.match(guest.html, /000443540438/);
  assert.match(guest.html, /MU13MCBL0944000443540438000MUR/);
  assert.match(guest.html, /MCBLMUMU/);
});

test("hidden bank block uses TBA and omits account digits", function () {
  process.env.BANK_DETAILS_PUBLIC = "false";
  try {
    const guest = buildGuestEmail("reserved", sample);
    assert.match(guest.html, new RegExp(TBA_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(guest.text, new RegExp(TBA_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(guest.html, /000443540438/);
    assert.doesNotMatch(guest.text, /MU13MCBL0944000443540438000MUR/);
  } finally {
    restoreBankEnv();
  }
});

test("notifyBooking without transport stays queued and does not send", async function () {
  const result = await notifyBooking("reserved", sample);
  assert.equal(result.sent, false);
  assert.equal(result.queued, true);
  assert.equal(result.channel, "queue");
});

test("notifyBooking sends guest + treasurer HTML via Resend", async function () {
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
    const result = await notifyBooking("reserved", sample);
    assert.equal(result.sent, true);
    assert.equal(result.channel, "resend");
    assert.equal(result.queued, false);
    assert.equal(payloads.length, 2);
    assert.equal(payloads[0].from, "RTM AGM 2027 <bookings@friday.mu>");
    assert.equal(payloads[0].to[0], "alex@example.com");
    assert.equal(payloads[1].to[0], "ishant@ayacorp.io");
    payloads.forEach(function (payload) {
      assert.match(payload.html, /<!DOCTYPE html>/);
      assert.match(payload.text, /RTM27-MOREL-1842/);
      assert.match(payload.html, /#c9a24b/);
    });
  } finally {
    delete process.env.RESEND_API_KEY;
    global.fetch = prevFetch;
  }
});

test("buildMessages covers guest then treasurer", function () {
  const messages = buildMessages("paid_claimed", sample);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].audience, "guest");
  assert.equal(messages[1].audience, "treasurer");
  assert.match(messages[0].subject, /Payment noted/);
});

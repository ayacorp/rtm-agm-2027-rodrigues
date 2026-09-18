"use strict";

process.env.NODE_ENV = "test";
process.env.STORE_DRIVER = "memory";
delete process.env.BANK_DETAILS_PUBLIC;
delete process.env.BOOKING_NOTIFY_EMAIL;
delete process.env.MCB_ACCOUNT_NAME;
delete process.env.MCB_BANK;
delete process.env.MCB_BANK_NAME;
delete process.env.MCB_ACCOUNT_NUMBER;
delete process.env.MCB_IBAN;
delete process.env.MCB_SWIFT;
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_HOST;
delete process.env.ADMIN_TOKEN;

const fs = require("fs");
const path = require("path");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeQuote, partnerCost, childCost } = require("../lib/pricing");
const { allocateRef, isValidRef, slugFromName } = require("../lib/refs");
const { publicBank, TBA_MESSAGE, notifyEmail } = require("../lib/bank");
const { resetStoreForTests, getStore } = require("../lib/store");
const { createReservation } = require("../api/reserve");
const { markPaidClaim } = require("../api/booking/paid");

function setPublishedEnv() {
  process.env.MCB_ACCOUNT_NAME = "Round Table 9 (Reg. 17280)";
  process.env.MCB_BANK = "MCB";
  process.env.MCB_ACCOUNT_NUMBER = "000443540438";
  process.env.MCB_IBAN = "MU13MCBL0944000443540438000MUR";
  process.env.MCB_SWIFT = "MCBLMUMU";
  process.env.BOOKING_NOTIFY_EMAIL = "roundtable9.mu@gmail.com";
}

test("indicative ticket maths matches the booking sheet", function () {
  assert.equal(computeQuote({ roomType: "share", kids: 0 }).total, 29700);
  assert.equal(computeQuote({ roomType: "single", kids: 0 }).total, 35700);
  assert.equal(partnerCost(), 25300);
  assert.equal(computeQuote({ roomType: "partner", kids: 0 }).total, 29700 + 25300);
  assert.equal(childCost(), 10200);
  assert.equal(computeQuote({ roomType: "partner", kids: 1 }).total, 29700 + 25300 + 10200);
  assert.equal(computeQuote({ roomType: "share", kids: 2 }).kids, 0);
});

test("refs are RTM27-XXXX-#### and unique", async function () {
  assert.equal(slugFromName("Jean Dupont"), "DUPO");
  const seen = new Set();
  const ref = await allocateRef("Marie Laval", function (candidate) {
    assert.equal(isValidRef(candidate), true);
    return seen.has(candidate);
  });
  assert.match(ref, /^RTM27-LAVA-\d{4}$/);
  seen.add(ref);
  const second = await allocateRef("Marie Laval", function (candidate) {
    return seen.has(candidate);
  });
  assert.notEqual(second, ref);
});

test("published bank block is the CoS GO strings", function () {
  const bank = publicBank();
  assert.equal(bank.public, true);
  assert.equal(bank.beneficiaryName, "Round Table 9 (Reg. 17280)");
  assert.equal(bank.bank, "MCB");
  assert.equal(bank.accountNumber, "000443540438");
  assert.equal(bank.iban, "MU13MCBL0944000443540438000MUR");
  assert.equal(bank.swift, "MCBLMUMU");
  assert.equal(notifyEmail(), "roundtable9.mu@gmail.com");
  assert.doesNotMatch(JSON.stringify(bank), /000011738626/);
});

test("BANK_DETAILS_PUBLIC=false hides numbers even when env is set", function () {
  setPublishedEnv();
  process.env.BANK_DETAILS_PUBLIC = "false";
  const bank = publicBank();
  delete process.env.BANK_DETAILS_PUBLIC;
  assert.equal(bank.public, false);
  assert.equal(bank.message, TBA_MESSAGE);
  assert.equal(bank.accountNumber, undefined);
  assert.doesNotMatch(JSON.stringify(bank), /000443540438/);
});

test("client assets do not hardcode MCB account digits", function () {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const js = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
  const adminJs = fs.readFileSync(path.join(root, "js/admin.js"), "utf8");
  [html, js, adminJs].forEach(function (src) {
    assert.doesNotMatch(src, /000443540438/);
    assert.doesNotMatch(src, /MU13MCBL0944000443540438000MUR/);
    assert.doesNotMatch(src, /MCBLMUMU/);
    assert.doesNotMatch(src, /000011738626/);
    assert.doesNotMatch(src, /Reg\. 17280/);
  });
});

test("reserve persists a pending_payment record with a server ref", async function () {
  resetStoreForTests();
  const created = await createReservation({
    name: "Alex Morel",
    email: "alex@example.com",
    phone: "59061912",
    roomType: "share",
    kids: 0,
  });
  assert.equal(created.reservation.status, "pending_payment");
  assert.equal(created.reservation.total, 29700);
  assert.match(created.reservation.ref, /^RTM27-MORE-\d{4}$/);
  const stored = await getStore().get(created.reservation.ref);
  assert.ok(stored);
  assert.equal(stored.email, "alex@example.com");
  assert.equal(created.notify.queued, true);
  assert.equal(created.quote.total, 29700);
  assert.equal(publicBank().public, true);
  assert.equal(publicBank().accountNumber, "000443540438");
});

test("I've paid moves status to awaiting_verification", async function () {
  resetStoreForTests();
  const created = await createReservation({
    name: "Sam Patel",
    email: "sam@example.com",
    roomType: "single",
    kids: 0,
  });
  const claimed = await markPaidClaim({
    ref: created.reservation.ref,
    email: "sam@example.com",
  });
  assert.equal(claimed.reservation.status, "awaiting_verification");
  assert.equal(claimed.reservation.total, 35700);
});

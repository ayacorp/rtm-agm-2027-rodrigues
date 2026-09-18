"use strict";

process.env.NODE_ENV = "test";
process.env.STORE_DRIVER = "memory";
process.env.BANK_DETAILS_PUBLIC = "true";
process.env.BOOKING_NOTIFY_EMAIL = "ishant@ayacorp.io";
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_HOST;
delete process.env.ADMIN_TOKEN;

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeQuote, partnerCost, childCost } = require("../lib/pricing");
const { allocateRef, isValidRef, slugFromName } = require("../lib/refs");
const { publicBank, OFFICIAL_BANK, TBA_MESSAGE, notifyEmail } = require("../lib/bank");
const { resetStoreForTests, getStore } = require("../lib/store");
const { createReservation } = require("../api/reserve");
const { markPaidClaim } = require("../api/booking/paid");

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

test("public bank block uses the MRT 9 MCB strings only", function () {
  const bank = publicBank();
  assert.equal(bank.public, true);
  assert.equal(bank.beneficiaryName, "Mauritius Round Table No. 9");
  assert.equal(bank.chequesPayableTo, "Round Table 9");
  assert.equal(bank.bank, "The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis");
  assert.equal(bank.accountNumber, "000443540438");
  assert.equal(bank.iban, "MU13MCBL0944000443540438000MUR");
  assert.equal(bank.swift, "MCBLMUMU");
  assert.equal(bank.labels.beneficiaryName, "Beneficiary name");
  assert.equal(bank.labels.chequesPayableTo, "Cheques payable to");
  assert.equal(bank.labels.accountNumber, "Account");
  assert.equal(bank.labels.swift, "SWIFT");
  assert.doesNotMatch(JSON.stringify(bank), /000011738626/);
  assert.doesNotMatch(JSON.stringify(bank), /Reg\. 17280/);
  assert.doesNotMatch(JSON.stringify(bank), /roundtable9\.mu@gmail\.com/);
  assert.equal(OFFICIAL_BANK.accountNumber, "000443540438");
  assert.equal(notifyEmail(), "ishant@ayacorp.io");
});

test("hidden bank details show the TBA message", function () {
  process.env.BANK_DETAILS_PUBLIC = "false";
  const bank = publicBank();
  process.env.BANK_DETAILS_PUBLIC = "true";
  assert.equal(bank.public, false);
  assert.equal(bank.message, TBA_MESSAGE);
  assert.equal(bank.accountNumber, undefined);
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

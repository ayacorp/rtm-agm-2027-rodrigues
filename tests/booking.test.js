"use strict";

process.env.NODE_ENV = "test";
process.env.STORE_DRIVER = "memory";
delete process.env.BANK_DETAILS_PUBLIC;
delete process.env.BOOKING_NOTIFY_EMAIL;
delete process.env.MCB_ACCOUNT_NAME;
delete process.env.MCB_CHEQUES_PAYABLE;
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
const { resetStoreForTests, getStore, detectDriver } = require("../lib/store");
const { blobConfigured, uploadProof, setBlobPutForTests, resetProofForTests } = require("../lib/proof");
const { createReservation } = require("../api/reserve");
const { markPaidClaim } = require("../api/booking/paid");
const { submitProof } = require("../api/booking/proof");

function setPublishedEnv() {
  process.env.MCB_ACCOUNT_NAME = "Mauritius Round Table No. 9";
  process.env.MCB_CHEQUES_PAYABLE = "Round Table 9";
  process.env.MCB_BANK = "The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis";
  process.env.MCB_ACCOUNT_NUMBER = "000443540438";
  process.env.MCB_IBAN = "MU13MCBL0944000443540438000MUR";
  process.env.MCB_SWIFT = "MCBLMUMU";
  process.env.BOOKING_NOTIFY_EMAIL = "ishant@ayacorp.io";
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

test("published bank block is the locked MRT 9 MCB strings", function () {
  const bank = publicBank();
  assert.equal(bank.public, true);
  assert.equal(bank.beneficiaryName, "Mauritius Round Table No. 9");
  assert.equal(bank.chequesPayableTo, "Round Table 9");
  assert.equal(bank.bank, "The Mauritius Commercial Bank (MCB), Sir William Newton Street, Port Louis");
  assert.equal(bank.accountNumber, "000443540438");
  assert.equal(bank.iban, "MU13MCBL0944000443540438000MUR");
  assert.equal(bank.swift, "MCBLMUMU");
  assert.equal(notifyEmail(), "ishant@ayacorp.io");
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

test("footer credits Aya Corp the same way as Portal Passport", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(
    html,
    /<span class="foot-credit-powered">Powered by <a href="https:\/\/www\.ayacorp\.io" target="_blank" rel="noopener noreferrer" class="footer-credit-link">Aya Corp<\/a><\/span>/
  );
  assert.doesNotMatch(html, /style="/);
  assert.doesNotMatch(html, /href="https:\/\/ayacorp\.io"/);
  assert.doesNotMatch(html, /ayacob/i);
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

test("detectDriver prefers POSTGRES_URL and does not treat Blob as the booking store", function () {
  const prev = {
    STORE_DRIVER: process.env.STORE_DRIVER,
    POSTGRES_URL: process.env.POSTGRES_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  };
  function restore() {
    Object.keys(prev).forEach(function (key) {
      if (prev[key] == null) delete process.env[key];
      else process.env[key] = prev[key];
    });
  }
  try {
    delete process.env.STORE_DRIVER;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.VERCEL;
    process.env.NODE_ENV = "production";
    process.env.POSTGRES_URL = "postgresql://user:pass@localhost/rtm";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    assert.equal(detectDriver(), "postgres");

    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    assert.equal(detectDriver(), "file");

    process.env.NODE_ENV = "test";
    assert.equal(detectDriver(), "memory");
  } finally {
    restore();
  }
});

test("proof upload is enabled only when BLOB_READ_WRITE_TOKEN is set", async function () {
  const prev = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  try {
    assert.equal(blobConfigured(), false);
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    assert.equal(blobConfigured(), true);
    setBlobPutForTests(async function (pathname, data, options) {
      assert.match(pathname, /^proofs\/RTM27-TEST-0001-\d+\.png$/);
      assert.equal(options.access, "public");
      assert.equal(options.token, "vercel_blob_rw_test");
      assert.ok(Buffer.isBuffer(data));
      return { url: "https://example.public.blob.vercel-storage.com/" + pathname };
    });
    const url = await uploadProof("RTM27-TEST-0001", {
      filename: "slip.png",
      contentType: "image/png",
      data: Buffer.from("fake-png"),
    });
    assert.match(url, /https:\/\/example\.public\.blob\.vercel-storage\.com\/proofs\//);
  } finally {
    resetProofForTests();
    if (prev == null) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prev;
  }
});

test("proof submit stores URL and moves status to awaiting_verification", async function () {
  resetStoreForTests();
  const prev = process.env.BLOB_READ_WRITE_TOKEN;
  process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  setBlobPutForTests(async function () {
    return { url: "https://example.public.blob.vercel-storage.com/proofs/demo.png" };
  });
  try {
    const created = await createReservation({
      name: "Priya Shah",
      email: "priya@example.com",
      roomType: "share",
      kids: 0,
    });
    const result = await submitProof(
      { ref: created.reservation.ref, email: "priya@example.com" },
      { filename: "slip.png", contentType: "image/png", data: Buffer.from("fake-png") }
    );
    assert.equal(result.reservation.status, "awaiting_verification");
    assert.equal(result.reservation.proofUrl, "https://example.public.blob.vercel-storage.com/proofs/demo.png");
  } finally {
    resetProofForTests();
    if (prev == null) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prev;
  }
});

test("proof submit without Blob token is 503", async function () {
  resetStoreForTests();
  resetProofForTests();
  const prev = process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const created = await createReservation({
    name: "No Blob",
    email: "noblob@example.com",
    roomType: "share",
  });
  try {
    await submitProof(
      { ref: created.reservation.ref, email: "noblob@example.com" },
      { filename: "slip.png", contentType: "image/png", data: Buffer.from("fake-png") }
    );
    assert.fail("expected 503");
  } catch (err) {
    assert.equal(err.statusCode, 503);
    assert.match(err.message, /BLOB_READ_WRITE_TOKEN/);
  } finally {
    if (prev == null) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prev;
  }
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

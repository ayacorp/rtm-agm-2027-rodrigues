"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBookingSearch,
  bookingSearchString,
  companionsFromState,
  adultsLabel,
  guestsLabel,
  allowsKids,
  normalizeKids,
} = require("../js/booking-state");

test("URL query round-trips room and kids", function () {
  assert.deepEqual(parseBookingSearch("?room=partner&kids=2"), { room: "partner", kids: 2 });
  assert.deepEqual(parseBookingSearch("room=single&kids=1"), { room: "single", kids: 1 });
  assert.equal(bookingSearchString({ room: "partner", kids: 1 }), "room=partner&kids=1");
});

test("invalid or missing query falls back to twin-share", function () {
  assert.deepEqual(parseBookingSearch(""), { room: "share", kids: 0 });
  assert.deepEqual(parseBookingSearch("?room=penthouse&kids=9"), { room: "share", kids: 0 });
});

test("twin-share never keeps children", function () {
  assert.equal(normalizeKids(2, "share"), 0);
  assert.deepEqual(parseBookingSearch("?room=share&kids=2"), { room: "share", kids: 0 });
});

test("companions and adults copy match the picker", function () {
  assert.equal(adultsLabel("share"), "1 adult");
  assert.equal(adultsLabel("partner"), "2 adults");
  assert.equal(companionsFromState({ room: "share", kids: 0 }), "");
  assert.equal(companionsFromState({ room: "partner", kids: 0 }), "Partner");
  assert.equal(companionsFromState({ room: "partner", kids: 2 }), "Partner + 2 children");
  assert.equal(companionsFromState({ room: "single", kids: 1 }), "1 child");
});

test("guest summary tracks room, partner, and kids", function () {
  assert.equal(guestsLabel({ room: "share", kids: 0 }), "1 Tabler");
  assert.equal(guestsLabel({ room: "share", kids: 2 }), "1 Tabler");
  assert.equal(guestsLabel({ room: "partner", kids: 0 }), "1 Tabler + partner");
  assert.equal(guestsLabel({ room: "partner", kids: 1 }), "1 Tabler + partner + 1 child");
  assert.equal(guestsLabel({ room: "partner", kids: 2 }), "1 Tabler + partner + 2 children");
  assert.equal(guestsLabel({ room: "single", kids: 1 }), "1 Tabler + 1 child");
});

test("twin-share cannot take children; partner and single can", function () {
  assert.equal(allowsKids("share"), false);
  assert.equal(allowsKids("partner"), true);
  assert.equal(allowsKids("single"), true);
  assert.equal(normalizeKids(2, "share"), 0);
  assert.equal(normalizeKids(2, "partner"), 2);
});

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseBookingSearch,
  bookingSearchString,
  companionsFromState,
  adultsLabel,
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

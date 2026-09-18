"use strict";

const PRICING = {
  currency: "Rs",
  isoCurrency: "MUR",
  nights: 3,
  singleNight: 7000,
  doubleNight: 10200,
  childNight: 1400,
  flightAdult: 10000,
  flightChild: 6000,
  eventLevy: 3000,
  buffer: 0.05,
};

const ROOM_TYPES = ["share", "partner", "single"];

function round100(n) {
  return Math.round(n / 100) * 100;
}

function memberTicket(accom) {
  return round100((accom + PRICING.flightAdult + PRICING.eventLevy) * (1 + PRICING.buffer));
}

function accommodationShare() {
  return (PRICING.doubleNight / 2) * PRICING.nights;
}

function accommodationSingle() {
  return PRICING.singleNight * PRICING.nights;
}

function accommodationChild() {
  return PRICING.childNight * PRICING.nights;
}

function partnerCost() {
  return round100(accommodationShare() + PRICING.flightAdult);
}

function childCost() {
  return round100(accommodationChild() + PRICING.flightChild);
}

function normalizeRoomType(roomType) {
  const value = String(roomType || "").trim().toLowerCase();
  if (ROOM_TYPES.indexOf(value) === -1) return null;
  return value;
}

function normalizeKids(kids, roomType) {
  const n = Number(kids);
  const count = Number.isFinite(n) ? Math.max(0, Math.min(2, Math.round(n))) : 0;
  if (roomType === "share") return 0;
  return count;
}

function computeQuote(input) {
  const roomType = normalizeRoomType(input && input.roomType);
  if (!roomType) {
    const err = new Error("Invalid room type");
    err.statusCode = 400;
    throw err;
  }
  const kids = normalizeKids(input && input.kids, roomType);
  const lines = [];
  let roomsText = "";

  if (roomType === "single") {
    lines.push({
      t: "Your place · Tabler",
      s: "Single room · half board · flights · AGM",
      v: memberTicket(accommodationSingle()),
    });
    roomsText = "One single room · sole occupancy";
  } else {
    lines.push({
      t: "Your place · Tabler",
      s: "Shared room · half board · flights · AGM",
      v: memberTicket(accommodationShare()),
    });
    roomsText = roomType === "partner"
      ? "One double room · you and your partner"
      : "One shared room · we'll pair you with a fellow Tabler";
  }

  if (roomType === "partner") {
    lines.push({
      t: "Your partner",
      s: "Shares your room · half board · flights · no AGM",
      v: partnerCost(),
    });
  }

  if (kids > 0) {
    lines.push({
      t: "Children × " + kids,
      s: "Sofa bed · half board · flight (est. Rs 6,000)",
      v: childCost() * kids,
    });
    roomsText += " + " + kids + (kids > 1 ? " children" : " child") + " on the sofa bed";
  }

  const total = lines.reduce(function (sum, line) {
    return sum + line.v;
  }, 0);

  return {
    roomType: roomType,
    kids: kids,
    lines: lines,
    total: total,
    currency: PRICING.isoCurrency,
    roomsText: roomsText,
  };
}

function roomLabel(roomType) {
  if (roomType === "single") return "Single room";
  if (roomType === "partner") return "Double with partner";
  return "Twin-share";
}

module.exports = {
  PRICING,
  ROOM_TYPES,
  computeQuote,
  normalizeRoomType,
  normalizeKids,
  roomLabel,
  memberTicket,
  partnerCost,
  childCost,
  accommodationShare,
  accommodationSingle,
};

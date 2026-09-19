"use strict";

const crypto = require("crypto");

const REF_RE = /^RTM27-[A-Z]{2,4}-\d{4}$/;

function slugFromName(name) {
  const last = String(name || "").trim().split(/\s+/).pop() || "";
  const letters = last.replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase();
  return letters.length >= 2 ? letters : "AGM";
}

function randomDigits() {
  return String(crypto.randomInt(1000, 10000));
}

function makeCandidate(name) {
  return "RTM27-" + slugFromName(name) + "-" + randomDigits();
}

function isValidRef(ref) {
  return REF_RE.test(String(ref || ""));
}

async function allocateRef(name, existsFn) {
  for (let i = 0; i < 24; i += 1) {
    const ref = makeCandidate(name);
    if (!(await existsFn(ref))) return ref;
  }
  const fallback = "RTM27-" + slugFromName(name).slice(0, 2) + crypto.randomInt(10, 100) + "-" + randomDigits();
  if (!(await existsFn(fallback))) return fallback;
  const err = new Error("Could not allocate a unique booking reference");
  err.statusCode = 503;
  throw err;
}

module.exports = {
  REF_RE,
  slugFromName,
  makeCandidate,
  isValidRef,
  allocateRef,
};

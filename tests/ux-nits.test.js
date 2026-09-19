"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/styles.css"), "utf8");
const mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");

test("homepage has no inline style attributes", function () {
  assert.doesNotMatch(html, /\sstyle="/);
});

test("guest summaries exist on the calculator and reserve form", function () {
  assert.match(html, /id="calcGuests"/);
  assert.match(html, /id="smGuests"/);
  assert.match(mainJs, /setText\("calcGuests"/);
  assert.match(mainJs, /setText\("smGuests"/);
});

test("kids stepper is hidden for twin-share and gated in JS", function () {
  assert.match(html, /id="kidField" class="hidden"/);
  assert.match(html, /id="formKidField"/);
  assert.match(mainJs, /syncKidControls/);
  assert.match(mainJs, /kidsAllowed\(\)/);
});

test("sticky header offset is applied to in-page anchors", function () {
  assert.match(css, /--sticky-nav-offset/);
  assert.match(css, /scroll-padding-top:\s*var\(--sticky-nav-offset\)/);
  assert.match(css, /scroll-margin-top:\s*var\(--sticky-nav-offset\)/);
  assert.match(html, /id="invitation"/);
});

test("CSP style-src stays hash-free of unsafe-inline; JS does not set element.style", function () {
  assert.match(vercel, /style-src 'self' https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(vercel, /unsafe-inline/);
  assert.doesNotMatch(mainJs, /\.style\./);
});

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
  assert.doesNotMatch(css, /scroll-margin-top:\s*var\(--sticky-nav-offset\)/);
  assert.match(html, /id="invitation"/);
});

test("CSP style-src stays hash-free of unsafe-inline; JS does not set element.style", function () {
  assert.match(vercel, /style-src 'self' https:\/\/fonts\.googleapis\.com/);
  assert.doesNotMatch(vercel, /unsafe-inline/);
  assert.doesNotMatch(mainJs, /\.style\./);
});

test("Contact us is email-only to ishant@ayacorp.io", function () {
  assert.match(html, /id="contact"/);
  assert.match(html, /href="#contact">Contact</);
  assert.match(html, /mailto:ishant@ayacorp\.io">Contact us/);
  assert.match(html, /WhatsApp or a form may follow/);
  assert.doesNotMatch(html, /wa\.me|whatsapp\.com|\+230\s*\d{4}/i);
  assert.doesNotMatch(html, /<form[^>]*id="contact/i);
});

test("framed photos lock aspect-ratio so mobile heights cannot use raw HTML height", function () {
  assert.match(css, /\.frame figure\.is-wide \{ aspect-ratio: 16 \/ 10; \}/);
  assert.match(css, /\.frame figure\.is-sq \{ aspect-ratio: 1; \}/);
  assert.match(css, /\.frame figure\.is-tall \{ aspect-ratio: 5 \/ 6; \}/);
  assert.match(css, /\.mem-grid \.frame figure \{ aspect-ratio: 4 \/ 5; \}/);
  assert.match(css, /img \{\n  display: block;\n  max-width: 100%;\n  height: auto;/);
  assert.match(css, /\.frame img \{\n  object-fit: cover;/);
  assert.match(html, /<figure class="is-wide">/);
  assert.match(html, /<figure class="is-tall">/);
});

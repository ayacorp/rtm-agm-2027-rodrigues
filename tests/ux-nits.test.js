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

test("Contact us is a short Resend form, not mailto or WhatsApp", function () {
  assert.match(html, /id="contact"/);
  assert.match(html, /href="#contact">Contact</);
  assert.match(html, /href="#contact">Contact us</);
  assert.match(html, /id="contactForm"/);
  assert.match(html, /id="cName" name="name"/);
  assert.match(html, /id="cEmail" name="email"/);
  assert.match(html, /id="cMessage" name="message"/);
  assert.match(html, /id="contactBtn"/);
  assert.match(html, /id="contactConfirm"/);
  assert.match(html, /<script src="\/js\/contact\.js" defer><\/script>/);
  assert.doesNotMatch(html, /mailto:ishant@ayacorp\.io/);
  assert.doesNotMatch(html, /wa\.me|whatsapp\.com|WhatsApp/i);
});

test("framed photos lock aspect-ratio so mobile heights cannot use raw HTML height", function () {
  assert.match(css, /\.photo-pair \{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /\.mem-grid \{[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(css, /img \{\n  display: block;\n  max-width: 100%;\n  height: auto;/);
  assert.match(css, /\.frame img \{\n  object-fit: cover;/);
  assert.match(html, /<figure class="is-wide">/);
  assert.match(html, /<figure class="is-tall">/);
});

test("phone breakpoint stacks destination and media photos to one column", function () {
  assert.match(css, /@media \(max-width: 640px\)/);
  const phone = css.split("@media (max-width: 640px)")[1] || "";
  assert.match(phone, /\.photo-pair/);
  assert.match(phone, /\.mem-grid/);
  assert.match(phone, /grid-template-columns:\s*1fr/);
  const desktop = css.split("@media (min-width: 641px)")[1] || "";
  assert.match(desktop, /\.photo-pair \{ grid-template-columns: 1fr 1fr; \}/);
});

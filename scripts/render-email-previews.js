"use strict";

const fs = require("fs");
const path = require("path");
const { publicBank } = require("../lib/bank");
const { buildGuestEmail, buildTreasurerEmail } = require("../lib/email-templates");

const outDir = path.join(__dirname, "..", "email-previews");
const logoUrl = "../assets/logo.png";
const treasurerTo = "ishant@ayacorp.io";

const kinds = [
  {
    id: "reserved",
    kind: "reserved",
    reservation: {
      ref: "RTM27-MOREL-1842",
      name: "Alex Morel",
      email: "alex@example.com",
      phone: "59061912",
      table: "RT9",
      companions: "Partner + one child",
      roomType: "partner",
      kids: 1,
      total: 65200,
      status: "pending_payment",
      createdAt: "2026-09-19T10:00:00.000Z",
      proofUrl: "",
    },
  },
  {
    id: "paid-claimed",
    kind: "paid_claimed",
    reservation: {
      ref: "RTM27-MOREL-1842",
      name: "Alex Morel",
      email: "alex@example.com",
      phone: "59061912",
      table: "RT9",
      companions: "Partner + one child",
      roomType: "partner",
      kids: 1,
      total: 65200,
      status: "awaiting_verification",
      createdAt: "2026-09-19T10:00:00.000Z",
      proofUrl: "",
    },
  },
  {
    id: "proof-received",
    kind: "proof_received",
    reservation: {
      ref: "RTM27-MOREL-1842",
      name: "Alex Morel",
      email: "alex@example.com",
      phone: "59061912",
      table: "RT9",
      companions: "Partner + one child",
      roomType: "partner",
      kids: 1,
      total: 65200,
      status: "awaiting_verification",
      createdAt: "2026-09-19T10:00:00.000Z",
      proofUrl: "https://example.public.blob.vercel-storage.com/proofs/rtm27-morel-1842.png",
    },
  },
];

function writePair(slug, message) {
  fs.writeFileSync(path.join(outDir, slug + ".html"), message.html, "utf8");
  fs.writeFileSync(path.join(outDir, slug + ".txt"), message.text + "\n", "utf8");
}

function indexHtml(entries) {
  const cards = entries.map(function (entry) {
    return '<section class="card">'
      + "<h2>" + entry.title + "</h2>"
      + "<p class=\"meta\">" + entry.subject + "</p>"
      + '<iframe src="' + entry.file + '" title="' + entry.title + '"></iframe>'
      + '<p class="links"><a href="' + entry.file + '">HTML</a> · <a href="' + entry.text + '">text/plain</a></p>'
      + "</section>";
  }).join("\n");
  return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
    + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>RTM AGM 2027 · booking email previews</title>"
    + "<style>"
    + "body{margin:0;background:#083e52;color:#fbf7ee;font-family:Georgia,Times,serif;}"
    + "header{padding:36px 24px 12px;text-align:center;}"
    + "h1{margin:0 0 8px;font-size:32px;}"
    + ".kicker{font-family:'Courier New',monospace;letter-spacing:.18em;text-transform:uppercase;color:#e6d2a0;font-size:12px;}"
    + ".grid{display:grid;gap:24px;padding:24px;max-width:1280px;margin:0 auto;}"
    + "@media(min-width:960px){.grid{grid-template-columns:1fr 1fr;}}"
    + ".card{background:#04303f;border:1px solid #c9a24b;padding:16px;}"
    + "h2{margin:0 0 6px;font-size:20px;color:#ffffff;}"
    + ".meta{margin:0 0 12px;color:#e6d2a0;font-size:13px;}"
    + "iframe{width:100%;height:720px;border:0;background:#083e52;}"
    + ".links{margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;}"
    + "a{color:#c9a24b;}"
    + "</style></head><body>"
    + "<header><p class=\"kicker\">Round Table Mauritius · AGM 2027</p>"
    + "<h1>Booking email previews</h1>"
    + "<p>Guest + treasurer HTML with text/plain fallbacks. Bank block from publicBank().</p></header>"
    + "<div class=\"grid\">" + cards + "</div></body></html>";
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const bank = publicBank();
  const entries = [];
  kinds.forEach(function (item) {
    const guest = buildGuestEmail(item.kind, item.reservation, { logoUrl: logoUrl });
    const treasurer = buildTreasurerEmail(item.kind, item.reservation, {
      to: treasurerTo,
      logoUrl: logoUrl,
    });
    writePair(item.id + "-guest", guest);
    writePair(item.id + "-treasurer", treasurer);
    entries.push({
      title: item.id + " · guest",
      subject: guest.subject,
      file: item.id + "-guest.html",
      text: item.id + "-guest.txt",
    });
    entries.push({
      title: item.id + " · treasurer",
      subject: treasurer.subject,
      file: item.id + "-treasurer.html",
      text: item.id + "-treasurer.txt",
    });
  });
  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml(entries), "utf8");
  const readme = [
    "# Booking email previews",
    "",
    "Checked-in HTML + text/plain renders for the reserve / I've paid / proof paths.",
    "",
    "Regenerate:",
    "",
    "```bash",
    "npm run email-previews",
    "```",
    "",
    "Bank numbers come from `publicBank()` (locked MCB strings). These files are server-side previews, not client checkout copy.",
    "",
    "Logo: `assets/logo.png` (raster of `assets/logo.svg`).",
    "",
    "Public bank at render time: **" + (bank.public ? "visible" : "hidden") + "**.",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "README.md"), readme, "utf8");
}

main();

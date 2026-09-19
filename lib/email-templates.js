"use strict";

const { publicBank, TBA_MESSAGE, treasurerPhone } = require("./bank");
const { roomLabel } = require("./pricing");

const SITE_URL = "https://rtm-agm-2027-rodrigues.vercel.app";
const COLORS = {
  lagoon: "#083e52",
  lagoonDeep: "#04303f",
  teal: "#0c5a72",
  gold: "#c9a24b",
  goldSoft: "#e6d2a0",
  ivory: "#fbf7ee",
  sand: "#f3ebda",
  ink: "#123a44",
  muted: "#5c6b84",
  white: "#ffffff",
};

function siteUrl() {
  const raw = process.env.PUBLIC_SITE_URL;
  if (raw && String(raw).trim()) return String(raw).trim().replace(/\/$/, "");
  return SITE_URL;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(total) {
  return "Rs " + Number(total || 0).toLocaleString("en-US");
}

function guestsLine(reservation) {
  const kids = Number(reservation && reservation.kids) || 0;
  return "1 Tabler"
    + (reservation && reservation.roomType === "partner" ? " + partner" : "")
    + (kids ? " + " + kids + (kids > 1 ? " children" : " child") : "");
}

function logoUrl(options) {
  if (options && options.logoUrl) return options.logoUrl;
  return siteUrl() + "/assets/logo.png";
}

function bankRows(bank) {
  if (!bank || !bank.public || !bank.confirmed) {
    return [{ k: "Transfer", v: (bank && bank.message) || TBA_MESSAGE }];
  }
  const rows = [
    { k: "Beneficiary name", v: bank.beneficiaryName },
    { k: "Cheques payable to", v: bank.chequesPayableTo },
    { k: "Bank", v: bank.bank },
    { k: "Account", v: bank.accountNumber },
    { k: "IBAN", v: bank.iban },
    { k: "SWIFT", v: bank.swift },
  ];
  return rows.filter(function (row) { return row.v; });
}

function bankHtml(bank) {
  const rows = bankRows(bank).map(function (row) {
    return '<tr><td style="padding:8px 0;font-family:Georgia,Times,serif;font-size:13px;color:#e6d2a0;width:42%;">'
      + escapeHtml(row.k)
      + '</td><td style="padding:8px 0;font-family:\'Courier New\',monospace;font-size:13px;color:#ffffff;text-align:right;">'
      + escapeHtml(row.v)
      + "</td></tr>";
  }).join("");
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c5a72;border:1px solid #c9a24b;">'
    + '<tr><td style="padding:20px 22px;">'
    + '<p style="margin:0 0 6px;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#c9a24b;">MCB MUR transfer</p>'
    + '<p style="margin:0 0 14px;font-family:Georgia,Times,serif;font-size:14px;color:#ffffff;">The only payment rail — quote your booking reference</p>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' + rows + "</table>"
    + "</td></tr></table>";
}

function bankText(bank) {
  return bankRows(bank).map(function (row) {
    return row.k + ": " + row.v;
  }).join("\n");
}

function wrapHtml(options) {
  const cta = options.ctaHref
    ? '<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto;"><tr><td style="background:#c9a24b;border-radius:2px;">'
      + '<a href="' + escapeHtml(options.ctaHref) + '" style="display:inline-block;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;color:#0c5a72;">'
      + escapeHtml(options.ctaLabel || "Open the booking site")
      + "</a></td></tr></table>"
    : "";
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + "<title>" + escapeHtml(options.title) + "</title></head>"
    + '<body style="margin:0;padding:0;background:#083e52;color:#123a44;">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + escapeHtml(options.preheader || "") + "</div>"
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#083e52;"><tr><td style="padding:28px 12px;">'
    + '<table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center" style="width:600px;max-width:100%;">'
    + '<tr><td style="text-align:center;padding:8px 16px 22px;">'
    + '<img src="' + escapeHtml(options.logoSrc) + '" width="86" height="86" alt="Round Table Mauritius" style="display:block;margin:0 auto 14px;border:0;">'
    + '<p style="margin:0;font-family:Georgia,Times,serif;font-size:22px;color:#ffffff;">Round Table Mauritius</p>'
    + '<p style="margin:6px 0 0;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#e6d2a0;">Annual General Meeting · 2027</p>'
    + "</td></tr>"
    + '<tr><td style="background:#fbf7ee;padding:36px 32px 28px;border:1px solid #c9a24b;">'
    + '<p style="margin:0 0 10px;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#0e6e7d;">'
    + escapeHtml(options.eyebrow)
    + "</p>"
    + '<h1 style="margin:0 0 16px;font-family:Georgia,Times,serif;font-size:34px;line-height:1.15;font-weight:600;color:#0c5a72;">'
    + escapeHtml(options.heading)
    + "</h1>"
    + '<p style="margin:0 0 22px;font-family:Georgia,Times,serif;font-style:italic;font-size:16px;line-height:1.55;color:#5c6b84;">'
    + escapeHtml(options.lede)
    + "</p>"
    + options.innerHtml
    + cta
    + '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#5c6b84;">'
    + escapeHtml(options.footer || "Cotton Bay Resort & Spa, Pointe Coton, Rodrigues · 13–16 May 2027 · MCB MUR transfer only.")
    + "</p>"
    + "</td></tr>"
    + '<tr><td style="padding:18px 8px 0;text-align:center;font-family:\'Courier New\',monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#e6d2a0;">Adopt · Adapt · Improve</td></tr>'
    + "</table></td></tr></table></body></html>";
}

function refBoxHtml(ref, total, label) {
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;background:#083e52;border:1px dashed #c9a24b;"><tr><td style="padding:18px 20px;text-align:center;">'
    + '<p style="margin:0 0 6px;font-family:\'Courier New\',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#e6d2a0;">'
    + escapeHtml(label || "Your payment reference")
    + "</p>"
    + '<p style="margin:0 0 8px;font-family:\'Courier New\',monospace;font-size:24px;font-weight:700;color:#ffffff;">' + escapeHtml(ref) + "</p>"
    + '<p style="margin:0;font-family:Georgia,Times,serif;font-size:16px;color:#e6d2a0;">' + escapeHtml(formatMoney(total)) + " · MUR</p>"
    + "</td></tr></table>";
}

function factsHtml(pairs) {
  const rows = pairs.map(function (pair) {
    return '<tr><td style="padding:9px 0;border-bottom:1px solid rgba(12,90,114,0.12);font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5c6b84;">'
      + escapeHtml(pair.k)
      + '</td><td style="padding:9px 0;border-bottom:1px solid rgba(12,90,114,0.12);font-family:Georgia,Times,serif;font-size:15px;color:#0c5a72;text-align:right;">'
      + escapeHtml(pair.v)
      + "</td></tr>";
  }).join("");
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">' + rows + "</table>";
}

function guestCopy(kind, reservation) {
  if (kind === "reserved") {
    return {
      subject: "Your place is reserved · " + reservation.ref,
      preheader: "Quote " + reservation.ref + " on your MCB transfer. Amount due " + formatMoney(reservation.total) + ".",
      eyebrow: "Reserve your place",
      heading: "Your place is reserved.",
      lede: "Three nights at Cotton Bay Resort & Spa, Rodrigues — 13–16 May 2027. Hold this reference and send the MUR total by MCB transfer only.",
      ctaLabel: "Return to the booking site",
    };
  }
  if (kind === "proof_received") {
    return {
      subject: "Transfer proof received · " + reservation.ref,
      preheader: "We have your transfer proof for " + reservation.ref + ". Awaiting verification.",
      eyebrow: "Proof received",
      heading: "We have your proof.",
      lede: "The organisers can match your file to " + reservation.ref + ". Your place stays pending until the transfer is verified.",
      ctaLabel: "Open the booking site",
    };
  }
  return {
    subject: "Payment noted · " + reservation.ref,
    preheader: "We've recorded your payment claim for " + reservation.ref + ". Awaiting verification.",
    eyebrow: "I've paid",
    heading: "Payment noted.",
    lede: "Thank you. We have marked " + reservation.ref + " as awaiting verification. Keep using this reference on the transfer narrative.",
    ctaLabel: "Open the booking site",
  };
}

function treasurerCopy(kind, reservation) {
  if (kind === "reserved") {
    return {
      subject: "[RTM AGM 2027] New reservation " + reservation.ref,
      preheader: reservation.name + " reserved " + reservation.ref + " · " + formatMoney(reservation.total),
      eyebrow: "Treasurer notify",
      heading: "A place has been reserved.",
      lede: "Match the MCB transfer to this reference. Rail is MUR bank transfer only.",
      ctaLabel: "Open the public site",
    };
  }
  if (kind === "proof_received") {
    return {
      subject: "[RTM AGM 2027] Proof received " + reservation.ref,
      preheader: "Proof uploaded for " + reservation.ref,
      eyebrow: "Treasurer notify",
      heading: "Transfer proof received.",
      lede: "A guest uploaded a transfer screenshot or PDF. Verify against the MCB account.",
      ctaLabel: "Open the public site",
    };
  }
  return {
    subject: "[RTM AGM 2027] Payment claimed " + reservation.ref,
    preheader: reservation.name + " marked " + reservation.ref + " as paid",
    eyebrow: "Treasurer notify",
    heading: "A guest marked a booking as paid.",
    lede: "Status is awaiting verification. Confirm the MCB credit before marking paid.",
    ctaLabel: "Open the public site",
  };
}

function guestInnerHtml(kind, reservation, bank) {
  const facts = [
    { k: "Name", v: reservation.name },
    { k: "Room", v: roomLabel(reservation.roomType) },
    { k: "Guests", v: guestsLine(reservation) },
    { k: "Stay", v: "13–16 May 2027 · Cotton Bay" },
  ];
  if (reservation.companions) facts.push({ k: "Joining", v: reservation.companions });
  let extra = "";
  if (kind === "reserved") {
    extra = '<p style="margin:18px 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#123a44;">Use the reference as the transfer narrative. Deposit and cancellation terms stay TBA. No cards.</p>';
  }
  return refBoxHtml(reservation.ref, reservation.total) + factsHtml(facts) + extra + bankHtml(bank);
}

function treasurerInnerHtml(reservation, bank) {
  const facts = [
    { k: "Reference", v: reservation.ref },
    { k: "Name", v: reservation.name },
    { k: "Email", v: reservation.email },
    { k: "Phone", v: reservation.phone || "—" },
    { k: "Table", v: reservation.table || "—" },
    { k: "Room", v: reservation.roomType },
    { k: "Kids", v: String(reservation.kids == null ? 0 : reservation.kids) },
    { k: "Companions", v: reservation.companions || "—" },
    { k: "Total", v: formatMoney(reservation.total) + " MUR" },
    { k: "Status", v: reservation.status },
    { k: "Proof", v: reservation.proofUrl || "—" },
    { k: "Created", v: reservation.createdAt || "—" },
    { k: "Treasurer phone", v: treasurerPhone() },
  ];
  return refBoxHtml(reservation.ref, reservation.total, "Booking reference") + factsHtml(facts) + bankHtml(bank);
}

function guestText(kind, reservation, bank) {
  const copy = guestCopy(kind, reservation);
  const lines = [
    copy.heading,
    copy.lede,
    "",
    "Reference: " + reservation.ref,
    "Amount: " + formatMoney(reservation.total) + " MUR",
    "Room: " + roomLabel(reservation.roomType),
    "Guests: " + guestsLine(reservation),
    reservation.companions ? "Joining: " + reservation.companions : "",
    "",
    "MCB MUR transfer only. Quote " + reservation.ref + " as the payment reference.",
    bankText(bank),
    "",
    siteUrl(),
    "Cotton Bay Resort & Spa, Pointe Coton, Rodrigues · 13–16 May 2027",
  ];
  return lines.filter(Boolean).join("\n");
}

function treasurerText(kind, reservation, bank) {
  const copy = treasurerCopy(kind, reservation);
  const lines = [
    copy.heading,
    "",
    "Reference: " + reservation.ref,
    "Name: " + reservation.name,
    "Email: " + reservation.email,
    "Phone: " + (reservation.phone || "—"),
    "Table: " + (reservation.table || "—"),
    "Room: " + reservation.roomType,
    "Kids: " + (reservation.kids == null ? 0 : reservation.kids),
    "Total: " + formatMoney(reservation.total) + " MUR",
    "Status: " + reservation.status,
    "Proof: " + (reservation.proofUrl || "—"),
    "Created: " + (reservation.createdAt || "—"),
    "",
    "Rail: MCB MUR bank transfer only. Quote " + reservation.ref + " as the payment reference.",
    bankText(bank),
    "Treasurer copy phone: " + treasurerPhone(),
    siteUrl(),
  ];
  return lines.join("\n");
}

function buildGuestEmail(kind, reservation, options) {
  const bank = publicBank();
  const copy = guestCopy(kind, reservation);
  const href = siteUrl() + "/#reserve";
  return {
    audience: "guest",
    kind: kind,
    to: reservation.email,
    subject: copy.subject,
    text: guestText(kind, reservation, bank),
    html: wrapHtml({
      title: copy.subject,
      preheader: copy.preheader,
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      lede: copy.lede,
      innerHtml: guestInnerHtml(kind, reservation, bank),
      ctaHref: href,
      ctaLabel: copy.ctaLabel,
      logoSrc: logoUrl(options),
    }),
  };
}

function buildTreasurerEmail(kind, reservation, options) {
  const bank = publicBank();
  const copy = treasurerCopy(kind, reservation);
  return {
    audience: "treasurer",
    kind: kind,
    to: options && options.to,
    subject: copy.subject,
    text: treasurerText(kind, reservation, bank),
    html: wrapHtml({
      title: copy.subject,
      preheader: copy.preheader,
      eyebrow: copy.eyebrow,
      heading: copy.heading,
      lede: copy.lede,
      innerHtml: treasurerInnerHtml(reservation, bank),
      ctaHref: siteUrl(),
      ctaLabel: copy.ctaLabel,
      logoSrc: logoUrl(options),
    }),
  };
}

module.exports = {
  SITE_URL: SITE_URL,
  COLORS: COLORS,
  siteUrl: siteUrl,
  escapeHtml: escapeHtml,
  formatMoney: formatMoney,
  guestsLine: guestsLine,
  bankRows: bankRows,
  buildGuestEmail: buildGuestEmail,
  buildTreasurerEmail: buildTreasurerEmail,
};

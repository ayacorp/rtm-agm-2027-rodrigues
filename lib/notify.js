"use strict";

const fs = require("fs/promises");
const path = require("path");
const { notifyEmail } = require("./bank");
const { buildGuestEmail, buildTreasurerEmail } = require("./email-templates");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  nodemailer = null;
}

const DEFAULT_FROM = "RTM AGM 2027 <bookings@friday.mu>";

function queuePath() {
  if (process.env.VERCEL === "1") return path.join("/tmp", "rtm-notify-queue.json");
  return path.join(process.cwd(), "data", "notify-queue.json");
}

function defaultFrom() {
  return process.env.RESEND_FROM || DEFAULT_FROM;
}

async function enqueue(entry) {
  if (process.env.NODE_ENV === "test") return;
  const file = queuePath();
  let rows = [];
  try {
    const raw = await fs.readFile(file, "utf8");
    rows = raw.trim() ? JSON.parse(raw) : [];
    if (!Array.isArray(rows)) rows = [];
  } catch (err) {
    rows = [];
  }
  rows.push(entry);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

function buildMessages(kind, reservation) {
  const messages = [];
  if (reservation && reservation.email) {
    messages.push(buildGuestEmail(kind, reservation));
  }
  const treasurerTo = notifyEmail();
  if (treasurerTo) {
    messages.push(buildTreasurerEmail(kind, reservation, { to: treasurerTo }));
  }
  return messages;
}

function buildMessage(kind, reservation) {
  const treasurerTo = notifyEmail();
  return buildTreasurerEmail(kind, reservation, { to: treasurerTo });
}

async function sendResend(message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: defaultFrom(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error("Resend failed: " + res.status + " " + body);
  }
  return "resend";
}

async function sendSmtp(message) {
  if (!process.env.SMTP_HOST || !nodemailer) return null;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "") === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" }
      : undefined,
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || defaultFrom(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return "smtp";
}

async function deliverAll(messages) {
  if (process.env.RESEND_API_KEY) {
    for (let i = 0; i < messages.length; i += 1) {
      await sendResend(messages[i]);
    }
    return "resend";
  }
  if (process.env.SMTP_HOST && nodemailer) {
    for (let i = 0; i < messages.length; i += 1) {
      await sendSmtp(messages[i]);
    }
    return "smtp";
  }
  return null;
}

async function notifyBooking(kind, reservation) {
  const messages = buildMessages(kind, reservation);
  if (!messages.length) {
    console.log("[rtm-notify] skipped send (no guest or treasurer recipient)", kind);
    await enqueue({
      at: new Date().toISOString(),
      kind: kind,
      messages: [],
      ref: reservation && reservation.ref,
      reason: "no recipients",
    });
    return { sent: false, channel: "queue", queued: true };
  }

  try {
    const channel = await deliverAll(messages);
    if (channel) {
      return { sent: true, channel: channel, queued: false };
    }
  } catch (err) {
    console.error("[rtm-notify] send failed, queueing", err);
    await enqueue({
      at: new Date().toISOString(),
      kind: kind,
      error: String(err && err.message ? err.message : err),
      messages: messages,
      ref: reservation && reservation.ref,
    });
    return { sent: false, channel: "queue", queued: true, error: String(err && err.message ? err.message : err) };
  }

  console.log("[rtm-notify] queued (no RESEND_API_KEY or SMTP_HOST)", messages.map(function (row) { return row.subject; }).join(" | "));
  await enqueue({
    at: new Date().toISOString(),
    kind: kind,
    messages: messages,
    ref: reservation && reservation.ref,
  });
  return { sent: false, channel: "queue", queued: true };
}

module.exports = {
  DEFAULT_FROM: DEFAULT_FROM,
  defaultFrom: defaultFrom,
  notifyBooking: notifyBooking,
  buildMessage: buildMessage,
  buildMessages: buildMessages,
};

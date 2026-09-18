"use strict";

const fs = require("fs/promises");
const path = require("path");
const { notifyEmail, treasurerPhone } = require("./bank");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  nodemailer = null;
}

function queuePath() {
  if (process.env.VERCEL === "1") return path.join("/tmp", "rtm-notify-queue.json");
  return path.join(process.cwd(), "data", "notify-queue.json");
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

function formatMoney(total) {
  return "Rs " + Number(total || 0).toLocaleString("en-US");
}

function buildMessage(kind, reservation) {
  const to = notifyEmail();
  const phone = treasurerPhone();
  const subject = kind === "reserved"
    ? "[RTM AGM 2027] New reservation " + reservation.ref
    : "[RTM AGM 2027] Payment claimed " + reservation.ref;
  const lines = [
    kind === "reserved" ? "A place has been reserved." : "A guest marked a booking as paid (awaiting verification).",
    "",
    "Reference: " + reservation.ref,
    "Name: " + reservation.name,
    "Email: " + reservation.email,
    "Phone: " + (reservation.phone || "—"),
    "Table: " + (reservation.table || "—"),
    "Room: " + reservation.roomType,
    "Kids: " + reservation.kids,
    "Total: " + formatMoney(reservation.total) + " MUR",
    "Status: " + reservation.status,
    "Proof: " + (reservation.proofUrl || "—"),
    "Created: " + reservation.createdAt,
    "",
    "Rail: MCB MUR bank transfer only. Quote " + reservation.ref + " as the payment reference.",
    "Treasurer copy phone: " + phone,
    "Notify inbox: " + to,
  ];
  return { to: to, subject: subject, text: lines.join("\n") };
}

async function sendResend(message) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = process.env.RESEND_FROM || "RTM AGM 2027 <bookings@example.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
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
    from: process.env.SMTP_FROM || process.env.SMTP_USER || message.to,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });
  return "smtp";
}

async function notifyBooking(kind, reservation) {
  const message = buildMessage(kind, reservation);
  if (!message.to) {
    console.log("[rtm-notify] skipped send (BOOKING_NOTIFY_EMAIL empty)", message.subject);
    await enqueue({
      at: new Date().toISOString(),
      kind: kind,
      message: message,
      ref: reservation.ref,
      reason: "BOOKING_NOTIFY_EMAIL empty",
    });
    return { sent: false, channel: "queue", queued: true };
  }
  try {
    const viaResend = await sendResend(message);
    if (viaResend) {
      return { sent: true, channel: viaResend, queued: false };
    }
    const viaSmtp = await sendSmtp(message);
    if (viaSmtp) {
      return { sent: true, channel: viaSmtp, queued: false };
    }
  } catch (err) {
    console.error("[rtm-notify] send failed, queueing", err);
    await enqueue({
      at: new Date().toISOString(),
      kind: kind,
      error: String(err && err.message ? err.message : err),
      message: message,
      ref: reservation.ref,
    });
    return { sent: false, channel: "queue", queued: true, error: String(err && err.message ? err.message : err) };
  }

  console.log("[rtm-notify] queued (no RESEND_API_KEY or SMTP_HOST)", message.subject);
  await enqueue({
    at: new Date().toISOString(),
    kind: kind,
    message: message,
    ref: reservation.ref,
  });
  return { sent: false, channel: "queue", queued: true };
}

module.exports = {
  notifyBooking,
  buildMessage,
};

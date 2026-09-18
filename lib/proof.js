"use strict";

let blobPut = null;
try {
  blobPut = require("@vercel/blob").put;
} catch (err) {
  blobPut = null;
}

const ALLOWED = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const MAX_BYTES = 4.5 * 1024 * 1024;

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN && blobPut);
}

async function uploadProof(ref, file) {
  if (!blobConfigured()) {
    const err = new Error("Proof upload is not configured (set BLOB_READ_WRITE_TOKEN)");
    err.statusCode = 503;
    throw err;
  }
  if (!file || !file.data || !file.data.length) {
    const err = new Error("No proof file uploaded");
    err.statusCode = 400;
    throw err;
  }
  if (file.data.length > MAX_BYTES) {
    const err = new Error("Proof file is too large (max 4.5 MB)");
    err.statusCode = 413;
    throw err;
  }
  const type = String(file.contentType || "").toLowerCase();
  const ext = ALLOWED[type];
  if (!ext) {
    const err = new Error("Proof must be a PDF or image");
    err.statusCode = 400;
    throw err;
  }
  const safeRef = String(ref).replace(/[^A-Z0-9-]/gi, "");
  const pathname = "proofs/" + safeRef + "-" + Date.now() + "." + ext;
  const stored = await blobPut(pathname, file.data, {
    access: "private",
    contentType: type,
    addRandomSuffix: true,
  });
  return stored.url;
}

module.exports = {
  blobConfigured,
  uploadProof,
  MAX_BYTES,
};

"use strict";

const { put: vercelBlobPut } = require("@vercel/blob");

const ALLOWED = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

const MAX_BYTES = 4.5 * 1024 * 1024;

let putOverride = null;

function blobToken() {
  return String(process.env.BLOB_READ_WRITE_TOKEN || "").trim();
}

function blobConfigured() {
  return Boolean(blobToken());
}

function blobAccess() {
  const raw = String(process.env.BLOB_ACCESS || "public").trim().toLowerCase();
  return raw === "private" ? "private" : "public";
}

function inferExt(file) {
  const type = String((file && file.contentType) || "").toLowerCase();
  if (ALLOWED[type]) return { ext: ALLOWED[type], type: type };
  const name = String((file && file.filename) || "").toLowerCase();
  if (name.endsWith(".pdf")) return { ext: "pdf", type: "application/pdf" };
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return { ext: "jpg", type: "image/jpeg" };
  if (name.endsWith(".png")) return { ext: "png", type: "image/png" };
  if (name.endsWith(".webp")) return { ext: "webp", type: "image/webp" };
  if (name.endsWith(".heic")) return { ext: "heic", type: "image/heic" };
  return null;
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
  const inferred = inferExt(file);
  if (!inferred) {
    const err = new Error("Proof must be a PDF or image");
    err.statusCode = 400;
    throw err;
  }
  const safeRef = String(ref).replace(/[^A-Z0-9-]/gi, "");
  const pathname = "proofs/" + safeRef + "-" + Date.now() + "." + inferred.ext;
  const put = putOverride || vercelBlobPut;
  const stored = await put(pathname, file.data, {
    access: blobAccess(),
    contentType: inferred.type,
    addRandomSuffix: true,
    token: blobToken(),
  });
  if (!stored || !stored.url) {
    const err = new Error("Proof upload did not return a URL");
    err.statusCode = 502;
    throw err;
  }
  return stored.url;
}

function setBlobPutForTests(fn) {
  putOverride = fn;
}

function resetProofForTests() {
  putOverride = null;
}

module.exports = {
  blobConfigured,
  blobToken,
  blobAccess,
  uploadProof,
  setBlobPutForTests,
  resetProofForTests,
  MAX_BYTES,
};

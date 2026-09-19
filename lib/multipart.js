"use strict";

function headerValue(headers, name) {
  if (!headers) return "";
  return String(headers[name] || headers[name.toLowerCase()] || "");
}

function parseDisposition(value) {
  const out = {};
  const name = /name="([^"]+)"/i.exec(value);
  const filename = /filename="([^"]+)"/i.exec(value);
  if (name) out.name = name[1];
  if (filename) out.filename = filename[1];
  return out;
}

function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body));
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (chunk) { chunks.push(chunk); });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}

async function parseMultipart(req) {
  const contentType = headerValue(req.headers, "content-type");
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!boundaryMatch) {
    const err = new Error("Expected multipart form data");
    err.statusCode = 400;
    throw err;
  }
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const raw = await readRawBody(req);
  const boundaryBuf = Buffer.from("--" + boundary);
  const parts = [];
  let cursor = raw.indexOf(boundaryBuf);
  while (cursor !== -1) {
    const start = cursor + boundaryBuf.length;
    if (raw[start] === 45 && raw[start + 1] === 45) break;
    const next = raw.indexOf(boundaryBuf, start);
    if (next === -1) break;
    let part = raw.slice(start, next);
    if (part[0] === 13 && part[1] === 10) part = part.slice(2);
    if (part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, -2);
    }
    const sep = part.indexOf(Buffer.from("\r\n\r\n"));
    if (sep !== -1) {
      const head = part.slice(0, sep).toString("utf8");
      const body = part.slice(sep + 4);
      const headers = {};
      head.split("\r\n").forEach(function (line) {
        const idx = line.indexOf(":");
        if (idx !== -1) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
      });
      const disp = parseDisposition(headers["content-disposition"] || "");
      parts.push({
        name: disp.name || "",
        filename: disp.filename || "",
        contentType: headers["content-type"] || "application/octet-stream",
        data: body,
      });
    }
    cursor = next;
  }

  const fields = {};
  let file = null;
  parts.forEach(function (part) {
    if (part.filename) {
      file = part;
    } else {
      fields[part.name] = part.data.toString("utf8");
    }
  });
  return { fields: fields, file: file };
}

module.exports = {
  parseMultipart,
};

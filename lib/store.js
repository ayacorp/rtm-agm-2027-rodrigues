"use strict";

const fs = require("fs/promises");
const path = require("path");
const { neon: neonSql } = require("@neondatabase/serverless");

const STATUSES = ["pending_payment", "awaiting_verification", "paid"];

let kvClient = null;
let blobPut = null;
let blobList = null;
let memoryState = { byRef: new Map() };

try {
  kvClient = require("@vercel/kv").kv;
} catch (err) {
  kvClient = null;
}

try {
  const blob = require("@vercel/blob");
  blobPut = blob.put;
  blobList = blob.list;
} catch (err) {
  blobPut = null;
  blobList = null;
}

function postgresUrl() {
  return String(process.env.POSTGRES_URL || process.env.DATABASE_URL || "").trim();
}

function kvConfigured() {
  return Boolean(
    kvClient
    && String(process.env.KV_REST_API_URL || "").trim()
    && String(process.env.KV_REST_API_TOKEN || "").trim()
  );
}

function nowIso() {
  return new Date().toISOString();
}

function asIso(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    return parsed.toISOString();
  }
  return String(value);
}

function isVercel() {
  return process.env.VERCEL === "1";
}

function normalizeReservation(row) {
  if (!row) return null;
  return {
    ref: row.ref,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    table: row.table || "",
    companions: row.companions || "",
    notes: row.notes || "",
    roomType: row.roomType,
    kids: Number(row.kids) || 0,
    total: Number(row.total) || 0,
    currency: row.currency || "MUR",
    status: row.status,
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt || row.createdAt),
    proofUrl: row.proofUrl || "",
    notifyQueued: Boolean(row.notifyQueued),
    notifyLog: row.notifyLog || "",
  };
}

function assertStatus(status) {
  if (STATUSES.indexOf(status) === -1) {
    const err = new Error("Invalid status");
    err.statusCode = 400;
    throw err;
  }
}

function filePath() {
  if (isVercel()) return path.join("/tmp", "rtm-bookings.json");
  return path.join(process.cwd(), "data", "bookings.json");
}

async function readJsonFile(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeJsonFile(file, rows) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(rows, null, 2) + "\n", "utf8");
}

function createMemoryStore() {
  return {
    driver: "memory",
    production: false,
    persistence: "ephemeral",
    async get(ref) {
      return normalizeReservation(memoryState.byRef.get(ref) || null);
    },
    async exists(ref) {
      return memoryState.byRef.has(ref);
    },
    async list() {
      return Array.from(memoryState.byRef.values())
        .map(normalizeReservation)
        .sort(function (a, b) {
          return a.createdAt < b.createdAt ? 1 : -1;
        });
    },
    async create(record) {
      memoryState.byRef.set(record.ref, record);
      return normalizeReservation(record);
    },
    async update(ref, patch) {
      const current = memoryState.byRef.get(ref);
      if (!current) return null;
      const next = Object.assign({}, current, patch, { updatedAt: nowIso() });
      memoryState.byRef.set(ref, next);
      return normalizeReservation(next);
    },
  };
}

function createFileStore() {
  const file = filePath();
  const ephemeral = isVercel();
  return {
    driver: "file",
    production: false,
    persistence: ephemeral ? "ephemeral" : "local-json",
    warning: ephemeral
      ? "File store on Vercel uses /tmp and is not durable. Production MUST set POSTGRES_URL (preferred) or KV_REST_API_URL + KV_REST_API_TOKEN."
      : "Local JSON file store — not for production.",
    async get(ref) {
      const rows = await readJsonFile(file);
      return normalizeReservation(rows.find(function (row) { return row.ref === ref; }) || null);
    },
    async exists(ref) {
      const rows = await readJsonFile(file);
      return rows.some(function (row) { return row.ref === ref; });
    },
    async list() {
      const rows = await readJsonFile(file);
      return rows
        .map(normalizeReservation)
        .sort(function (a, b) {
          return a.createdAt < b.createdAt ? 1 : -1;
        });
    },
    async create(record) {
      const rows = await readJsonFile(file);
      rows.push(record);
      await writeJsonFile(file, rows);
      return normalizeReservation(record);
    },
    async update(ref, patch) {
      const rows = await readJsonFile(file);
      const index = rows.findIndex(function (row) { return row.ref === ref; });
      if (index === -1) return null;
      rows[index] = Object.assign({}, rows[index], patch, { updatedAt: nowIso() });
      await writeJsonFile(file, rows);
      return normalizeReservation(rows[index]);
    },
  };
}

function createKvStore() {
  return {
    driver: "kv",
    production: true,
    persistence: "vercel-kv",
    async get(ref) {
      const row = await kvClient.get("booking:" + ref);
      return normalizeReservation(row);
    },
    async exists(ref) {
      return Boolean(await kvClient.get("booking:" + ref));
    },
    async list() {
      const refs = await kvClient.smembers("bookings:index");
      const list = Array.isArray(refs) ? refs : [];
      const rows = [];
      for (const ref of list) {
        const row = await kvClient.get("booking:" + ref);
        if (row) rows.push(normalizeReservation(row));
      }
      return rows.sort(function (a, b) {
        return a.createdAt < b.createdAt ? 1 : -1;
      });
    },
    async create(record) {
      await kvClient.set("booking:" + record.ref, record);
      await kvClient.sadd("bookings:index", record.ref);
      return normalizeReservation(record);
    },
    async update(ref, patch) {
      const current = await kvClient.get("booking:" + ref);
      if (!current) return null;
      const next = Object.assign({}, current, patch, { updatedAt: nowIso() });
      await kvClient.set("booking:" + ref, next);
      return normalizeReservation(next);
    },
  };
}

const BLOB_INDEX = "reservations/bookings.json";

async function readBlobIndex() {
  const listed = await blobList({ prefix: BLOB_INDEX });
  const found = (listed.blobs || []).find(function (item) {
    return item.pathname === BLOB_INDEX;
  });
  if (!found) return [];
  const res = await fetch(found.url);
  if (!res.ok) return [];
  const parsed = await res.json();
  return Array.isArray(parsed) ? parsed : [];
}

function createBlobStore() {
  return {
    driver: "blob",
    production: true,
    persistence: "vercel-blob",
    async get(ref) {
      const rows = await readBlobIndex();
      return normalizeReservation(rows.find(function (row) { return row.ref === ref; }) || null);
    },
    async exists(ref) {
      const rows = await readBlobIndex();
      return rows.some(function (row) { return row.ref === ref; });
    },
    async list() {
      const rows = await readBlobIndex();
      return rows
        .map(normalizeReservation)
        .sort(function (a, b) {
          return a.createdAt < b.createdAt ? 1 : -1;
        });
    },
    async create(record) {
      const rows = await readBlobIndex();
      rows.push(record);
      await blobPut(BLOB_INDEX, JSON.stringify(rows, null, 2), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return normalizeReservation(record);
    },
    async update(ref, patch) {
      const rows = await readBlobIndex();
      const index = rows.findIndex(function (row) { return row.ref === ref; });
      if (index === -1) return null;
      rows[index] = Object.assign({}, rows[index], patch, { updatedAt: nowIso() });
      await blobPut(BLOB_INDEX, JSON.stringify(rows, null, 2), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      return normalizeReservation(rows[index]);
    },
  };
}

async function ensurePostgres(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS reservations (
      ref TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      table_name TEXT,
      companions TEXT,
      notes TEXT,
      room_type TEXT NOT NULL,
      kids INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'MUR',
      status TEXT NOT NULL,
      proof_url TEXT,
      notify_queued BOOLEAN NOT NULL DEFAULT FALSE,
      notify_log TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;
}

function rowFromPg(row) {
  if (!row) return null;
  return normalizeReservation({
    ref: row.ref,
    name: row.name,
    email: row.email,
    phone: row.phone,
    table: row.table_name,
    companions: row.companions,
    notes: row.notes,
    roomType: row.room_type,
    kids: row.kids,
    total: row.total,
    currency: row.currency,
    status: row.status,
    proofUrl: row.proof_url,
    notifyQueued: row.notify_queued,
    notifyLog: row.notify_log,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function createPostgresStore() {
  const sql = neonSql(postgresUrl());
  let ready = null;
  function readySql() {
    if (!ready) ready = ensurePostgres(sql);
    return ready;
  }
  return {
    driver: "postgres",
    production: true,
    persistence: "vercel-postgres",
    async get(ref) {
      await readySql();
      const rows = await sql`SELECT * FROM reservations WHERE ref = ${ref} LIMIT 1`;
      return rowFromPg(rows[0]);
    },
    async exists(ref) {
      await readySql();
      const rows = await sql`SELECT 1 FROM reservations WHERE ref = ${ref} LIMIT 1`;
      return rows.length > 0;
    },
    async list() {
      await readySql();
      const rows = await sql`SELECT * FROM reservations ORDER BY created_at DESC`;
      return rows.map(rowFromPg);
    },
    async create(record) {
      await readySql();
      await sql`
        INSERT INTO reservations (
          ref, name, email, phone, table_name, companions, notes,
          room_type, kids, total, currency, status, proof_url,
          notify_queued, notify_log, created_at, updated_at
        ) VALUES (
          ${record.ref}, ${record.name}, ${record.email}, ${record.phone || ""},
          ${record.table || ""}, ${record.companions || ""}, ${record.notes || ""},
          ${record.roomType}, ${record.kids}, ${record.total}, ${record.currency},
          ${record.status}, ${record.proofUrl || ""}, ${Boolean(record.notifyQueued)},
          ${record.notifyLog || ""}, ${record.createdAt}, ${record.updatedAt}
        )
      `;
      return normalizeReservation(record);
    },
    async update(ref, patch) {
      await readySql();
      const current = await this.get(ref);
      if (!current) return null;
      const next = Object.assign({}, current, patch, { updatedAt: nowIso() });
      await sql`
        UPDATE reservations SET
          name = ${next.name},
          email = ${next.email},
          phone = ${next.phone || ""},
          table_name = ${next.table || ""},
          companions = ${next.companions || ""},
          notes = ${next.notes || ""},
          room_type = ${next.roomType},
          kids = ${next.kids},
          total = ${next.total},
          currency = ${next.currency},
          status = ${next.status},
          proof_url = ${next.proofUrl || ""},
          notify_queued = ${Boolean(next.notifyQueued)},
          notify_log = ${next.notifyLog || ""},
          updated_at = ${next.updatedAt}
        WHERE ref = ${ref}
      `;
      return next;
    },
  };
}

function detectDriver() {
  const forced = String(process.env.STORE_DRIVER || "").trim().toLowerCase();
  if (forced) return forced;
  if (postgresUrl()) return "postgres";
  if (kvConfigured()) return "kv";
  if (process.env.NODE_ENV === "test") return "memory";
  return "file";
}

let cached = null;

function createStore(driver) {
  switch (driver) {
    case "postgres":
      if (!postgresUrl()) {
        throw new Error("Postgres store requested but POSTGRES_URL is missing");
      }
      return createPostgresStore();
    case "kv":
      if (!kvClient) throw new Error("KV store requested but @vercel/kv is missing");
      return createKvStore();
    case "blob":
      if (!blobPut) throw new Error("Blob store requested but @vercel/blob is missing");
      return createBlobStore();
    case "memory":
      return createMemoryStore();
    case "file":
      return createFileStore();
    default: {
      const err = new Error("Unknown STORE_DRIVER: " + driver);
      err.statusCode = 500;
      throw err;
    }
  }
}

function getStore() {
  if (!cached) cached = createStore(detectDriver());
  return cached;
}

function storeInfo() {
  const store = getStore();
  return {
    driver: store.driver,
    production: Boolean(store.production),
    persistence: store.persistence,
    warning: store.warning || "",
  };
}

function resetStoreForTests() {
  memoryState = { byRef: new Map() };
  cached = null;
}

function describeStoreRequirements() {
  return {
    preferred: [
      "POSTGRES_URL — Vercel Postgres / Neon (preferred, required in production)",
      "KV_REST_API_URL + KV_REST_API_TOKEN — Vercel KV (alternative)",
    ],
    proof: "BLOB_READ_WRITE_TOKEN — Vercel Blob, required to enable transfer proof upload",
    notify: "RESEND_API_KEY + RESEND_FROM — email ishant@ayacorp.io (SMTP_* also accepted)",
    fallback: "File JSON (data/bookings.json) is a local-only fallback. On Vercel without POSTGRES_URL or KV the API writes /tmp and bookings will vanish.",
  };
}

module.exports = {
  STATUSES,
  assertStatus,
  getStore,
  storeInfo,
  createStore,
  createMemoryStore,
  resetStoreForTests,
  detectDriver,
  describeStoreRequirements,
  postgresUrl,
  nowIso,
};

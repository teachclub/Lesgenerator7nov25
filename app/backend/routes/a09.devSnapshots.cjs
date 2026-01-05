"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Pool } = require("pg");

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function splitLines(text) {
  return String(text || "").replace(/\r\n/g, "\n").split("\n");
}

function headTail30(text) {
  const lines = splitLines(text);
  const head = lines.slice(0, 30).join("\n");
  const tail = lines.slice(Math.max(0, lines.length - 30)).join("\n");
  return { head30: head, tail30: tail, n_lines: lines.length };
}

// RepoRoot is ALTIJD app/backend (stabiel in Cloud Run).
function pickRepoRoot() {
  return path.resolve(__dirname, "..");
}

function normalizeRel(p) {
  let s = String(p || "").trim();
  s = s.replace(/\\/g, "/");
  s = s.replace(/^\/+/, "");
  s = s.replace(/^\.\//, "");

  // tolerante prefixes (oude calls)
  if (s.startsWith("app/backend/")) s = s.slice("app/backend/".length);
  if (s.startsWith("backend/")) s = s.slice("backend/".length);

  return s;
}

function resolveSafe(repoRoot, rel) {
  const norm = normalizeRel(rel);
  const abs = path.resolve(repoRoot, norm);
  const rr = path.resolve(repoRoot) + path.sep;
  if (!abs.startsWith(rr)) {
    throw new Error("unsafe path (outside repoRoot)");
  }
  return { norm, abs };
}

function getDbConnString() {
  return (
    process.env.DATABASE_URL ||
    process.env.LESSIE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  ).trim();
}

function makePool() {
  const cs = getDbConnString();
  if (!cs) throw new Error("No DATABASE_URL found in env");
  return new Pool({
    connectionString: cs,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

// Align met jouw bestaande schema (created_by/label/meta etc.)
async function ensureTables(pool) {
  const sql = `
BEGIN;

CREATE SCHEMA IF NOT EXISTS lessie;

CREATE TABLE IF NOT EXISTS lessie.snapshots (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'devhub',
  label text,
  git_sha text,
  runtime_instance text,
  host text,
  scope text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS lessie.snapshot_files (
  id bigserial PRIMARY KEY,
  snapshot_id bigint NOT NULL REFERENCES lessie.snapshots(id) ON DELETE CASCADE,
  path text NOT NULL,
  sha256 text NOT NULL,
  bytes int NOT NULL,
  n_lines int NOT NULL,
  head30 text,
  tail30 text,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_snapshots_created_at
ON lessie.snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS ix_snapshot_files_path_created
ON lessie.snapshot_files(path, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_snapshot_files_snapshot_path
ON lessie.snapshot_files(snapshot_id, path);

COMMIT;
`;
  await pool.query(sql);
}

module.exports = function a09DevSnapshotsFactory() {
  const router = express.Router();
  const repoRoot = pickRepoRoot();
  let pool = null;

  function getPool() {
    if (!pool) pool = makePool();
    return pool;
  }

  router.get("/dev/snapshots/ping", async (req, res) => {
    try {
      const p = getPool();
      await ensureTables(p);
      res.json({ ok: true, repoRoot, db: "ok" });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  router.post("/dev/snapshot", express.json({ limit: "4mb" }), async (req, res) => {
    const body = req.body || {};

    const pinnedPaths = Array.isArray(body.pinnedPaths) ? body.pinnedPaths : [];
    const scope = String(body.scope || "all");
    const createdBy = String(body.created_by || body.createdBy || "devhub");
    const label = body.label != null ? String(body.label) : null;

    const kind = String(body.kind || "manual");
    const note = body.note != null ? String(body.note) : null;

    const host = body.host != null ? String(body.host) : (req.get("host") ? String(req.get("host")) : null);
    const includeContent = body.includeContent === true;

    const gitSha =
      body.git_sha != null ? String(body.git_sha) :
      body.gitSha != null ? String(body.gitSha) :
      null;

    const runtimeInstance =
      body.runtime_instance != null ? String(body.runtime_instance) :
      body.runtimeInstance != null ? String(body.runtimeInstance) :
      null;

    const meta = Object.assign(
      {},
      (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) ? body.meta : {},
      { kind, note }
    );

    if (!pinnedPaths.length) {
      return res.status(400).json({ ok: false, error: "pinnedPaths required" });
    }
    if (pinnedPaths.length > 100) {
      return res.status(400).json({ ok: false, error: "too many pinnedPaths (max 100)" });
    }

    try {
      const p = getPool();
      await ensureTables(p);

      const client = await p.connect();
      try {
        await client.query("BEGIN");

        const insSnap = await client.query(
          `INSERT INTO lessie.snapshots(created_by, label, git_sha, runtime_instance, host, scope, meta)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, created_at`,
          [createdBy, label, gitSha, runtimeInstance, host, scope, JSON.stringify(meta)]
        );

        const snapshot = insSnap.rows[0];

        const items = [];
        for (const raw of pinnedPaths) {
          let norm, abs;
          try {
            ({ norm, abs } = resolveSafe(repoRoot, raw));
          } catch (e) {
            items.push({ path: normalizeRel(raw), ok: false, error: e && e.message ? e.message : String(e) });
            continue;
          }

          let buf;
          try {
            buf = fs.readFileSync(abs);
          } catch {
            items.push({ path: norm, ok: false, error: "not found" });
            continue;
          }

          if (buf.length > 700_000) {
            items.push({ path: norm, ok: false, error: "file too large (>700kb)" });
            continue;
          }

          const text = buf.toString("utf8");
          const h = sha256(text);
          const ht = headTail30(text);
          const content = includeContent ? text : null;

          await client.query(
            `INSERT INTO lessie.snapshot_files(snapshot_id, path, sha256, bytes, n_lines, head30, tail30, content)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (snapshot_id, path) DO NOTHING`,
            [snapshot.id, norm, h, buf.length, ht.n_lines, ht.head30, ht.tail30, content]
          );

          items.push({ path: norm, ok: true, sha256: h, bytes: buf.length, n_lines: ht.n_lines });
        }

        await client.query("COMMIT");
        res.json({ ok: true, snapshot, saved: items });
      } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        throw e;
      } finally {
        client.release();
      }
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  router.get("/dev/snapshots/file", async (req, res) => {
    const qpath = req.query.path ? String(req.query.path) : "";
    if (!qpath) return res.status(400).json({ ok: false, error: "path required" });

    const rel = normalizeRel(qpath);

    try {
      const p = getPool();
      await ensureTables(p);

      const r = await p.query(
        `SELECT
           s.id AS snapshot_id, s.created_at, s.created_by, s.label, s.git_sha, s.runtime_instance, s.host, s.scope,
           f.path, f.sha256, f.bytes, f.n_lines, f.head30, f.tail30
         FROM lessie.snapshot_files f
         JOIN lessie.snapshots s ON s.id = f.snapshot_id
         WHERE f.path = $1
         ORDER BY s.created_at DESC
         LIMIT 200`,
        [rel]
      );

      res.json({ ok: true, path: rel, items: r.rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  router.get("/dev/snapshots/latest", async (req, res) => {
    const pathsRaw = req.query.paths ? String(req.query.paths) : "";
    const paths = pathsRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 100)
      .map(normalizeRel);

    if (!paths.length) return res.status(400).json({ ok: false, error: "paths required (comma-separated)" });

    try {
      const p = getPool();
      await ensureTables(p);

      const r = await p.query(
        `WITH ranked AS (
           SELECT f.*, s.created_at, s.id AS snapshot_id,
                  row_number() OVER (PARTITION BY f.path ORDER BY s.created_at DESC) rn
           FROM lessie.snapshot_files f
           JOIN lessie.snapshots s ON s.id = f.snapshot_id
           WHERE f.path = ANY($1::text[])
         )
         SELECT path, sha256, bytes, n_lines, created_at, snapshot_id, head30, tail30
         FROM ranked
         WHERE rn = 1
         ORDER BY path`,
        [paths]
      );

      res.json({ ok: true, items: r.rows });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  router.get("/dev/snapshots/file-content", async (req, res) => {
    const qpath = req.query.path ? String(req.query.path) : "";
    const snapshotId = req.query.snapshot_id ? Number(req.query.snapshot_id) : NaN;

    if (!qpath || !Number.isFinite(snapshotId)) {
      return res.status(400).json({ ok: false, error: "path and snapshot_id required" });
    }

    const rel = normalizeRel(qpath);

    try {
      const p = getPool();
      await ensureTables(p);

      const r = await p.query(
        `SELECT snapshot_id, path, sha256, content, head30, tail30, bytes, n_lines
         FROM lessie.snapshot_files
         WHERE snapshot_id = $1 AND path = $2
         LIMIT 1`,
        [snapshotId, rel]
      );

      if (!r.rows.length) return res.status(404).json({ ok: false, error: "not found" });
      res.json({ ok: true, item: r.rows[0] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  });

  return router;
};


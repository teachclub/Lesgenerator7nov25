"use strict";

const http = require("http");
const https = require("https");

function isObj(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function safeUrl(raw) {
  if (typeof raw !== "string") return null;
  const u = raw.trim();
  if (!u) return null;

  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return null;
  }

  const proto = (parsed.protocol || "").toLowerCase();
  if (proto !== "http:" && proto !== "https:") return null;

  const host = (parsed.hostname || "").toLowerCase();
  if (!host) return null;

  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") {
    return null;
  }

  return parsed;
}

function fetchWithRedirect(urlObj, depth, cb) {
  const proto = urlObj.protocol.toLowerCase();
  const lib = proto === "https:" ? https : http;

  const req = lib.request(
    urlObj,
    {
      method: "GET",
      headers: {
        "User-Agent": "LesGO-image-proxy",
        Accept: "image/*,*/*;q=0.8",
        Referer: urlObj.origin,
      },
    },
    (up) => {
      const code = up.statusCode || 0;

      if ((code === 301 || code === 302 || code === 303 || code === 307 || code === 308) && up.headers.location) {
        if (depth >= 4) return cb(new Error("Too many redirects"));
        let next;
        try {
          next = new URL(up.headers.location, urlObj);
        } catch {
          return cb(new Error("Bad redirect URL"));
        }
        up.resume();
        return fetchWithRedirect(next, depth + 1, cb);
      }

      return cb(null, up);
    }
  );

  req.on("error", (e) => cb(e));
  req.setTimeout(12000, () => req.destroy(new Error("Proxy timeout")));
  req.end();
}

module.exports = function imageProxyRouter() {
  const express = require("express");
  const router = express.Router();

  router.get("/image-proxy", (req, res) => {
    const urlRaw = typeof req.query.url === "string" ? req.query.url : "";
    const urlObj = safeUrl(urlRaw);

    if (!urlObj) {
      return res.status(400).json({ ok: false, error: "BAD_URL" });
    }

    fetchWithRedirect(urlObj, 0, (err, upstream) => {
      if (err) {
        return res.status(502).json({ ok: false, error: "FETCH_FAILED", message: err.message });
      }

      const ct = (upstream.headers["content-type"] || "").toString();
      if (!ct.toLowerCase().startsWith("image/")) {
        upstream.resume();
        return res.status(415).json({ ok: false, error: "NOT_IMAGE", contentType: ct });
      }

      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");

      let bytes = 0;
      const MAX = 8 * 1024 * 1024;

      upstream.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX) {
          upstream.destroy(new Error("Image too large"));
        }
      });

      upstream.on("error", () => {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });

      upstream.pipe(res);
    });
  });

  return router;
};


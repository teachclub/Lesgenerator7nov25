"use strict";

const express = require("express");
const axios = require("axios");

const router = express.Router();

function isHttpUrl(u) {
  return /^https?:\/\//i.test(u || "");
}
function isDataOrBlob(u) {
  return /^(data:|blob:)/i.test(u || "");
}

router.get("/image-proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();

    if (!url || isDataOrBlob(url) || !isHttpUrl(url)) {
      return res.status(204).end();
    }

    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 12000,
      headers: { "User-Agent": "LesGO-image-proxy", Accept: "image/*,*/*;q=0.8" },
      maxContentLength: 6_000_000,
      maxBodyLength: 6_000_000,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const ct = String(r.headers["content-type"] || "image/*");
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(Buffer.from(r.data));
  } catch {
    return res.status(204).end();
  }
});

module.exports = router;


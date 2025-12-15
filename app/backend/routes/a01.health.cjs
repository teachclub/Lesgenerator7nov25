"use strict";

const express = require("express");

module.exports = function healthRouterFactory() {
  const r = express.Router();

  function healthPayload() {
    const kService = process.env.K_SERVICE || null;
    const kRevision = process.env.K_REVISION || null;
    const kConfig = process.env.K_CONFIGURATION || null;

    const gcpProject =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      null;

    const serviceName =
      process.env.SERVICE_NAME ||
      (kService ? String(kService) : "") ||
      "Lessie2000-backend";

    return {
      ok: true,
      service: serviceName,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || null,
      kService,
      kRevision,
      kConfiguration: kConfig,
      gcpProject,
    };
  }

  const routes = [
    "GET /",
    "GET /health",
    "GET /api/health",
    "GET /api/chips/ping",
    "POST /api/chips",
    "POST /api/search",
    "POST /api/search-preset",
    "POST /api/proposals-v2",
    "POST /api/refine-concept",
    "GET /api/image-proxy?url=...",
    "POST /api/generate-lesson-v2/step1",
    "POST /api/generate-lesson-v2/step2",
    "POST /api/generate-lesson-v2/step3",
    "POST /api/generate-lesson-v2/step4",
  ];

  r.get("/", (req, res) => {
    res.json({ ...healthPayload(), routes });
  });

  r.get("/health", (req, res) => {
    res.json(healthPayload());
  });

  r.get("/api/health", (req, res) => {
    res.json(healthPayload());
  });

  return r;
};


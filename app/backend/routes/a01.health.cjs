"use strict";

const express = require("express");

module.exports = function healthRouterFactory() {
const r = express.Router();

const serviceName = process.env.SERVICE_NAME || "Lessie2000-backend";

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
"POST /api/step1",
"POST /api/step2",
"POST /api/step3",
"POST /api/step4"
];

r.get("/", (req, res) => {
res.json({
ok: true,
service: serviceName,
timestamp: new Date().toISOString(),
routes
});
});

r.get("/health", (req, res) => {
res.json({
ok: true,
service: serviceName,
timestamp: new Date().toISOString()
});
});

r.get("/api/health", (req, res) => {
res.json({
ok: true,
service: serviceName,
timestamp: new Date().toISOString()
});
});

return r;
};

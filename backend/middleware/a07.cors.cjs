// a07.cors.cjs — simpele CORS policy
const cors = require("cors");

module.exports = cors({
  origin: (origin, cb) => cb(null, true),
  credentials: false,
  methods: ["GET", "POST", "HEAD", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});


// backend/middleware/a07.cors.cjs
const cors = require("cors");

const ORIGINS = [
  "http://localhost:5173",   // Vite dev
];

const corsOptions = {
  origin(origin, cb) {
    // Vite dev (no origin on curl / server-to-server)
    if (!origin) return cb(null, true);
    if (ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","X-Requested-With"],
  exposedHeaders: [],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

module.exports = { corsOptions };

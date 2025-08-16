// server.js
// Express + Socket.IO backend to broadcast site events to admin panels.
// Works locally and on Render/Heroku/etc. with robust CORS (incl. preflight).

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

// IMPORTANT: On Render you must use the provided PORT
const PORT = process.env.PORT || 9010;
const BUTTON_SECRET = process.env.BUTTON_SECRET || "change-me";

// Comma-separated list of allowed origins (exact scheme+host+optional port)
// Example:
//   ALLOWED_ORIGINS=https://www.policybenefits.org,https://policybenefits.org,http://localhost:5501
const ALLOWED_FROM_ENV = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Convenience: allow loopback (localhost/127.0.0.1) in dev on any port
function isLoopback(origin) {
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

const app = express();
const server = http.createServer(app);

/* ---------- CORS (REST) ---------- */
const corsOptionsDelegate = (origin, cb) => {
  // Non-browser/same-origin (no Origin header): allow
  if (!origin) {
    return cb(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-button-secret"],
      maxAge: 86400
    });
  }

  // Dev loopback always allowed
  if (isLoopback(origin)) {
    return cb(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-button-secret"],
      maxAge: 86400
    });
  }

  // Exact match from env
  if (ALLOWED_FROM_ENV.includes(origin)) {
    return cb(null, {
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-button-secret"],
      maxAge: 86400
    });
  }

  return cb(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(cors(corsOptionsDelegate));
// Handle preflight for all routes
app.options("*", cors(corsOptionsDelegate));

app.use(bodyParser.json());

/* ---------- Socket.IO (admin panels) ---------- */
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (isLoopback(origin)) return cb(null, true);
      if (ALLOWED_FROM_ENV.includes(origin)) return cb(null, true);
      return cb(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "x-button-secret"]
  }
});

io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  socket.on("disconnect", () => console.log("Admin disconnected:", socket.id));
});

/* ---------- Health ---------- */
app.get("/", (_req, res) => res.send("OK"));

/* ---------- Event endpoint ---------- */
app.post("/api/event", (req, res) => {
  const auth = req.header("x-button-secret");
  if (auth !== BUTTON_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { type = "unknown", who = "public-site", meta = {} } = req.body || {};
  const payload = { at: new Date().toISOString(), type, who, meta };

  io.emit("site:event", payload);
  return res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
  console.log("Allowed origins (env):", ALLOWED_FROM_ENV.length ? ALLOWED_FROM_ENV.join(", ") : "(none)");
});

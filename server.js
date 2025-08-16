// server.js
// Express + Socket.IO backend to broadcast site events to admin panels.
// Usage:
//   npm i
//   cp .env.example .env  (edit values)
//   npm run start
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 9010;
const BUTTON_SECRET = process.env.BUTTON_SECRET || "change-me";
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

// --- CORS for REST ---
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (ALLOWED.length === 0) return cb(null, true); // allow all if not set
    if (ALLOWED.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(bodyParser.json());

// --- Socket.IO (for admin panels) ---
const io = new Server(server, {
  cors: {
    origin: (ALLOWED.length ? ALLOWED : true),
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("Admin connected:", socket.id);
  socket.on("disconnect", () => console.log("Admin disconnected:", socket.id));
});

// Health
app.get("/", (_req, res) => res.send("OK"));

// Event endpoint - the public site posts here
app.post("/api/event", (req, res) => {
  const auth = req.header("x-button-secret");
  if (auth !== BUTTON_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const { type = "unknown", who = "public-site", meta = {} } = req.body || {};
  const payload = {
    at: new Date().toISOString(),
    type,
    who,
    meta
  };

  // Broadcast to all listening admin pages
  io.emit("site:event", payload);
  return res.json({ ok: true });
});

server.listen(PORT, () => {
  console.log(`Realtime server running at http://localhost:${PORT}`);
  console.log("Allowed origins:", ALLOWED.length ? ALLOWED.join(", ") : "(not restricted)");
});

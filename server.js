// server.js
// Express + Socket.IO backend to broadcast site events to admin panels.
// Works locally and on Render/Heroku/etc. with CORS allowed from all origins.

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 9010;
const BUTTON_SECRET = process.env.BUTTON_SECRET || "change-me";

const app = express();
const server = http.createServer(app);

/* ---------- CORS (REST) ---------- */
// Allow all origins
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-button-secret"],
  credentials: true,
  maxAge: 86400
}));

// Handle preflight for all routes
app.options("*", cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-button-secret"],
  credentials: true,
  maxAge: 86400
}));

app.use(bodyParser.json());

/* ---------- Socket.IO (admin panels) ---------- */
const io = new Server(server, {
  cors: {
    origin: "*",
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
  console.log("Allowed origins: ALL (*)");
});

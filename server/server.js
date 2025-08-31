import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "dev-super-secret";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("chat.db");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    passhash TEXT
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    fromId TEXT,
    toId TEXT,
    text TEXT,
    ts INTEGER
  )
`
).run();

const socketsByUser = new Map();

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  const existing = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (existing) return res.status(409).json({ error: "Username taken" });

  const id = uuid();
  const passhash = await bcrypt.hash(password, 10);

  db.prepare("INSERT INTO users (id, username, passhash) VALUES (?, ?, ?)").run(
    id,
    username,
    passhash
  );

  const token = jwt.sign({ sub: id, username }, JWT_SECRET, {
    expiresIn: "7d",
  });

  broadcastPresence();

  res.json({ token, user: { id, username } });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passhash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ sub: user.id, username }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token, user: { id: user.id, username } });
});

app.get("/api/users", (req, res) => {
  const rows = db.prepare("SELECT id, username FROM users").all();
  res.json(
    rows.map((u) => ({
      ...u,
      online: socketsByUser.has(u.id),
    }))
  );
});

app.get("/api/history/:peerId/:meId", (req, res) => {
  const { peerId, meId } = req.params;
  const rows = db
    .prepare(
      `
    SELECT id, fromId as "from", toId as "to", text, ts
    FROM messages
    WHERE (fromId = ? AND toId = ?) OR (fromId = ? AND toId = ?)
    ORDER BY ts ASC
  `
    )
    .all(meId, peerId, peerId, meId);

  res.json(rows);
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/ws") return socket.destroy();

  const token = url.searchParams.get("token");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
  } catch {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws, req) => {
  const { id, username } = req.user;
  socketsByUser.set(id, ws);
  broadcastPresence();

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "dm") {
        const { to, text } = msg;
        const ts = Date.now();
        const mid = uuid();

        db.prepare(
          "INSERT INTO messages (id, fromId, toId, text, ts) VALUES (?, ?, ?, ?, ?)"
        ).run(mid, id, to, text, ts);

        const entry = { type: "dm", id: mid, from: id, to, text, ts };

        const toSock = socketsByUser.get(to);
        if (toSock?.readyState === 1) toSock.send(JSON.stringify(entry));

        if (ws.readyState === 1) ws.send(JSON.stringify(entry));
      }
    } catch (e) {
      console.error("Bad message:", e);
    }
  });

  ws.on("close", () => {
    if (socketsByUser.get(id) === ws) socketsByUser.delete(id);
    broadcastPresence();
  });
});

function broadcastPresence() {
  const rows = db.prepare("SELECT id, username FROM users").all();
  const payload = JSON.stringify({
    type: "presence",
    users: rows.map((u) => ({
      ...u,
      online: socketsByUser.has(u.id),
    })),
  });

  for (const ws of socketsByUser.values()) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

const angularDistPath = path.join(
  __dirname,
  "../real-time-chat-app/dist/real-time-chat-app/browser"
);
app.use(express.static(angularDistPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(angularDistPath, "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`✅ API http://localhost:${PORT}`);
  console.log(`✅ WS  ws://localhost:${PORT}/ws?token=...`);
});

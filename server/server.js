// const WebSocket = require("ws");
// const wss = new WebSocket.Server({ port: 3000 });

// let users = [];
// let messages = [];

// wss.on("connection", (ws) => {
//   ws.on("message", (msg) => {
//     const data = JSON.parse(msg);

//     if (data.type === "login") {
//       if (users.some((u) => u.username === data.username)) {
//         ws.send(
//           JSON.stringify({
//             type: "loginError",
//             message: "Username already taken",
//           })
//         );
//         return;
//       }

//       ws.username = data.username;
//       users.push({ username: data.username });

//       ws.send(JSON.stringify({ type: "loginSuccess", username: ws.username }));

//       // Always send full chat history
//       ws.send(JSON.stringify({ type: "history", messages }));

//       broadcastUsers();
//     }

//     if (data.type === "message") {
//       const message = {
//         username: ws.username,
//         message: data.message,
//         timestamp: new Date().toISOString(),
//       };
//       messages.push(message);
//       broadcast({ type: "message", ...message });
//     }
//   });

//   ws.on("close", () => {
//     users = users.filter((u) => u.username !== ws.username);
//     broadcastUsers();
//   });
// });

// function broadcastUsers() {
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify({ type: "users", users }));
//     }
//   });
// }

// function broadcast(msg) {
//   wss.clients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(JSON.stringify(msg));
//     }
//   });
// }

import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "dev-super-secret";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

// --- In-memory stores (swap to DB for prod)
const users = new Map();          // id -> { id, username, passhash }
const usernameToId = new Map();   // username -> id
const messages = new Map();       // convoKey -> [{from,to,text,ts}]
const socketsByUser = new Map();  // userId -> ws

const convoKey = (a, b) => [a, b].sort().join("::");

// ---- Auth endpoints
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });
  if (usernameToId.has(username)) return res.status(409).json({ error: "Username taken" });

  const id = uuid();
  const passhash = await bcrypt.hash(password, 10);
  const user = { id, username, passhash };
  users.set(id, user);
  usernameToId.set(username, id);

  const token = jwt.sign({ sub: id, username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id, username } });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const id = usernameToId.get(username);
  if (!id) return res.status(401).json({ error: "Invalid credentials" });
  const user = users.get(id);
  const ok = await bcrypt.compare(password, user.passhash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: id, username }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id, username } });
});

// Simple list of users (for contact list)
app.get("/api/users", (req, res) => {
  res.json(
    Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      online: socketsByUser.has(u.id)
    }))
  );
});

// Fetch DM history
app.get("/api/history/:peerId/:meId", (req, res) => {
  const { peerId, meId } = req.params;
  const key = convoKey(peerId, meId);
  res.json(messages.get(key) || []);
});

// --- HTTP server + WS upgrade
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
        const entry = { type: "dm", from: id, to, text, ts };

        const key = convoKey(id, to);
        const arr = messages.get(key) || [];
        arr.push(entry);
        messages.set(key, arr);

        // deliver to both sides if connected
        const toSock = socketsByUser.get(to);
        if (toSock && toSock.readyState === 1) toSock.send(JSON.stringify(entry));
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
  const payload = JSON.stringify({
    type: "presence",
    users: Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      online: socketsByUser.has(u.id)
    }))
  });
  for (const ws of socketsByUser.values()) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

httpServer.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
  console.log(`WS  ws://localhost:${PORT}/ws?token=...`);
});

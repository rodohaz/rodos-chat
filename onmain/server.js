import express from "express";
import http from "http";
import { fileURLToPath } from "url";
import path from "path";
import { Server } from "socket.io";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama2";
const ALLOW_BOTS = (process.env.ALLOW_BOTS || "true") === "true";

app.use(express.json({limit: "1mb"}));
app.use(express.static(path.join(__dirname, "public")));

// Simple proxy to Ollama generate endpoint (non-streaming)
app.post("/api/ollama/generate", async (req, res) => {
  if(!ALLOW_BOTS) return res.status(403).json({error:"Bots disabled on server"});
  const prompt = req.body.prompt || "";
  const model = req.body.model || OLLAMA_MODEL;
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      }),
      // timeout and error handling simplified for example
    });
    if(!r.ok) {
      const text = await r.text();
      return res.status(502).json({error:"ollama_error", details: text});
    }
    const data = await r.json();
    // Ollama returns an array/obj depending on version; try to extract text
    let outText = "";
    if(Array.isArray(data)) {
      outText = data.map(p=>p?.output ?? "").join("\n");
    } else if(data?.completion) {
      outText = data.completion;
    } else if(data?.choices?.length) {
      outText = data.choices.map(c=>c.text||c.message?.content||"").join("\n");
    } else {
      outText = JSON.stringify(data);
    }
    return res.json({text: outText, raw: data});
  } catch (err) {
    console.error("Error contacting Ollama:", err);
    return res.status(500).json({error:"fetch_failed", details: String(err)});
  }
});

// In-memory rooms (simple example)
const rooms = {};

function ensureRoom(id) {
  if(!rooms[id]) {
    rooms[id] = {
      players: [], // {id, name, avatarDataUrl, isBot, expressions, socketId}
      turnIndex: 0,
      createdAt: Date.now(),
    };
  }
  return rooms[id];
}

io.on("connection", socket => {
  console.log("socket connected", socket.id);

  socket.on("create-room", ({roomId, name, avatar})=>{
    ensureRoom(roomId);
    socket.join(roomId);
    const room = rooms[roomId];
    const player = {id: socket.id, name: name||"Anon", avatarDataUrl: avatar||null, isBot:false, expressions:[], socketId: socket.id};
    room.players.push(player);
    io.to(roomId).emit("room-update", room);
  });

  socket.on("join-room", ({roomId, name, avatar})=>{
    ensureRoom(roomId);
    socket.join(roomId);
    const room = rooms[roomId];
    const player = {id: socket.id, name: name||"Anon", avatarDataUrl: avatar||null, isBot:false, expressions:[], socketId: socket.id};
    room.players.push(player);
    io.to(roomId).emit("room-update", room);
  });

  socket.on("create-bot", async ({roomId, botName})=>{
    if(!ALLOW_BOTS) return;
    const room = ensureRoom(roomId);
    const bot = {id: "bot-"+Date.now(), name: botName||"Bot", avatarDataUrl:null, isBot:true, expressions:[], socketId: null};
    room.players.push(bot);
    io.to(roomId).emit("room-update", room);
  });

  socket.on("start-turn-cycle", ({roomId})=>{
    const room = ensureRoom(roomId);
    room.turnIndex = 0;
    io.to(roomId).emit("turn-update", {turnIndex: room.turnIndex});
  });

  socket.on("player-message", async ({roomId, playerId, text})=>{
    const room = ensureRoom(roomId);
    // broadcast message
    io.to(roomId).emit("chat-message", {from: playerId, text});
    // advance turn
    room.turnIndex = (room.turnIndex + 1) % Math.max(1, room.players.length);
    io.to(roomId).emit("turn-update", {turnIndex: room.turnIndex});
    // if next is bot, trigger bot response
    const next = room.players[room.turnIndex];
    if(next && next.isBot) {
      try {
        const prompt = `You are ${next.name}. Reply briefly to the last message: "${text}"`;
        const r = await fetch(`http://localhost:${process.env.PORT || 3000}/api/ollama/generate`, {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({prompt, model: OLLAMA_MODEL})
        });
        const data = await r.json();
        const botText = data?.text || ("(bot failed to generate)");
        io.to(roomId).emit("chat-message", {from: next.id, text: botText});
        // advance turn again after bot speaks
        room.turnIndex = (room.turnIndex + 1) % Math.max(1, room.players.length);
        io.to(roomId).emit("turn-update", {turnIndex: room.turnIndex});
      } catch (e) {
        console.error("bot error", e);
      }
    }
  });

  socket.on("disconnect", ()=>{
    // remove from rooms
    for(const rid of Object.keys(rooms)) {
      const room = rooms[rid];
      const idx = room.players.findIndex(p=>p.socketId===socket.id);
      if(idx>=0){
        room.players.splice(idx,1);
        io.to(rid).emit("room-update", room);
      }
    }
  });
});

server.listen(PORT, ()=> console.log("Server running on port", PORT));

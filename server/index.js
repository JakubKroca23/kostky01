import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = new Map(); // socket.id -> { nickname, roomId }
const nicknames = new Set(); // Globally taken nicknames
const rooms = new Map(); // roomId -> { id, name, players: [{id, name}], maxPlayers: 6 }

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastRooms() {
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.length,
    maxPlayers: r.maxPlayers
  }));
  io.emit('room-list-update', roomList);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('set-nickname', (name) => {
    // ... existující logika (zůstává stejná)
    const trimmedName = name.trim();
    if (nicknames.has(trimmedName)) {
      socket.emit('nickname-error', 'Toto jméno je již obsazené.');
      return;
    }
    if (trimmedName.length < 3) {
      socket.emit('nickname-error', 'Jméno musí mít alespoň 3 znaky.');
      return;
    }
    nicknames.add(trimmedName);
    socket.data.nickname = trimmedName;
    players.set(socket.id, { nickname: trimmedName, roomId: null });
    console.log(`Player registered: ${trimmedName} (${socket.id})`);
    socket.emit('nickname-set', { success: true, nickname: trimmedName });
    
    // Po přihlášení mu pošleme aktuální seznam místností
    socket.emit('room-list-update', Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers
    })));
  });

  socket.on('create-room', (roomName) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomId = generateRoomId();
    const newRoom = {
      id: roomId,
      name: roomName || `Hra ${player.nickname}`,
      players: [{ id: socket.id, nickname: player.nickname }],
      maxPlayers: 6
    };

    rooms.set(roomId, newRoom);
    player.roomId = roomId;
    socket.join(roomId);

    console.log(`Room created: ${roomId} by ${player.nickname}`);
    socket.emit('room-joined', { roomId, room: newRoom });
    broadcastRooms();
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      // Pokud byl v místnosti, odstraňme ho
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) {
            rooms.delete(player.roomId);
            console.log(`Room ${player.roomId} closed (empty)`);
          }
        }
      }
      nicknames.delete(player.nickname);
      players.delete(socket.id);
      console.log(`Player disconnected: ${player.nickname}`);
      broadcastRooms();
    }
  });
});



const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

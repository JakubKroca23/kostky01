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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('set-nickname', (name) => {
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
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      nicknames.delete(player.nickname);
      players.delete(socket.id);
      console.log(`Player disconnected: ${player.nickname}`);
    }
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

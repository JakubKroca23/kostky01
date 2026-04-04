import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateScore } from './utils/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const players = new Map(); // socket.id -> { nickname, roomId }
const rooms = new Map(); // roomId -> { id, name, players: [{id, nickname}] }

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getRoomList() {
  return Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.length,
    maxPlayers: 6,
    playerNames: r.players.map(p => p.nickname)
  }));
}

function broadcastGlobalStats() {
  const allPlayers = Array.from(players.values()).map(p => p.nickname);
  io.emit('global-stats-update', {
    onlineCount: players.size,
    players: allPlayers
  });
}

function nextTurn(room) {
  const currentIndex = room.players.findIndex(p => p.id === room.turnInfo.currentTurnId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  
  room.turnInfo.currentTurnId = room.players[nextIndex].id;
  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.diceCount = 6;
  room.turnInfo.allowedIndexes = [];
  
  io.to(room.id).emit('turn-updated', { turnInfo: room.turnInfo });
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('set-nickname', (nickname) => {
    if (!nickname || nickname.length < 3) {
      return socket.emit('nickname-error', 'Jméno je příliš krátké.');
    }
    players.set(socket.id, { nickname, roomId: null });
    socket.emit('nickname-set', nickname);
    socket.emit('room-list-update', getRoomList());
    broadcastGlobalStats();
  });

  socket.on('change-nickname', (newNickname) => {
    const player = players.get(socket.id);
    if (player && newNickname && newNickname.length >= 3) {
      player.nickname = newNickname;
      socket.emit('nickname-set', newNickname);
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
          const p = room.players.find(p => p.id === socket.id);
          if (p) p.nickname = newNickname;
          io.to(player.roomId).emit('player-joined', { players: room.players });
          io.emit('room-list-update', getRoomList());
        }
      }
      broadcastGlobalStats();
    }
  });

  socket.on('create-room', (name) => {
    const player = players.get(socket.id);
    if (!player) return;
    const roomId = generateRoomId();
    const room = {
      id: roomId,
      name: name || `${player.nickname}'s Game`,
      players: [{ id: socket.id, nickname: player.nickname }],
      maxPlayers: 6,
      gameStarted: false,
      turnInfo: {
        currentTurnId: socket.id,
        turnPoints: 0,
        rollCount: 0,
        scores: { [socket.id]: 0 },
        lastRoll: [],
        diceCount: 6,
        allowedIndexes: []
      }
    };
    rooms.set(roomId, room);
    player.roomId = roomId;
    socket.join(roomId);
    socket.emit('room-joined', { roomId, room });
    io.emit('room-list-update', getRoomList());
  });

  socket.on('join-room', (roomId) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomId);
    if (!player || !room || room.players.length >= 6) return;
    
    room.players.push({ id: socket.id, nickname: player.nickname });
    room.turnInfo.scores[socket.id] = 0;
    player.roomId = roomId;
    socket.join(roomId);
    socket.emit('room-joined', { roomId, room });
    io.to(roomId).emit('player-joined', { players: room.players });
    io.emit('room-list-update', getRoomList());
  });

  socket.on('start-game', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (room && room.players[0].id === socket.id) {
      room.gameStarted = true;
      io.to(room.id).emit('game-started', { room });
      io.emit('room-list-update', getRoomList());
    }
  });

  socket.on('roll-dice', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;
    
    const { score, usedIndexes } = calculateScore(roll);
    room.turnInfo.allowedIndexes = usedIndexes;

    if (score === 0) {
      io.to(room.id).emit('dice-rolled', { roll, isBust: true });
      setTimeout(() => nextTurn(room), 1500);
    } else {
      io.to(room.id).emit('dice-rolled', { roll, turnPoints: room.turnInfo.turnPoints, allowedIndexes: usedIndexes });
    }
  });

  socket.on('roll-again', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    if (!selectedIndexes || selectedIndexes.length === 0) return;

    const selectedDice = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
    const { score } = calculateScore(selectedDice);

    // Ochrana: prázdná nebo neplatná kombinace
    if (score === 0) {
      socket.emit('nickname-error', 'Vybrané kostky nemají body. Vyber platné kostky.');
      return;
    }

    room.turnInfo.turnPoints += score;
    const rem = room.turnInfo.diceCount - selectedIndexes.length;
    room.turnInfo.diceCount = rem === 0 ? 6 : rem;

    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;
    room.turnInfo.rollCount++;

    const { score: nextScore, usedIndexes } = calculateScore(roll);
    room.turnInfo.allowedIndexes = usedIndexes;

    if (nextScore === 0) {
      io.to(room.id).emit('dice-rolled', { roll, isBust: true });
      setTimeout(() => nextTurn(room), 1500);
    } else {
      io.to(room.id).emit('dice-rolled', { roll, turnPoints: room.turnInfo.turnPoints, allowedIndexes: usedIndexes });
    }
  });

  socket.on('stop-turn', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    if (selectedIndexes.length > 0) {
      const { score } = calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]));
      room.turnInfo.turnPoints += score;
    }

    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    
    if (room.turnInfo.scores[socket.id] >= 10000) {
      io.to(room.id).emit('game-over', { winner: players.get(socket.id).nickname, scores: room.turnInfo.scores });
      rooms.delete(room.id);
      io.emit('room-list-update', getRoomList());
    } else {
      io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
      nextTurn(room);
    }
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) rooms.delete(player.roomId);
          else io.to(player.roomId).emit('player-left', { players: room.players });
          io.emit('room-list-update', getRoomList());
        }
      }
      players.delete(socket.id);
      broadcastGlobalStats();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

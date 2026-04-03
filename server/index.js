import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { calculateScore } from './utils/scoring.js';

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
const rooms = new Map(); // roomId -> { id, name, players: [{id, name}], maxPlayers: 6, turnInfo: {} }
const disconnectedPlayers = new Map(); // nickname -> { roomId, timeoutId }

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function nextTurn(room) {
  const currentIndex = room.players.findIndex(p => p.id === room.turnInfo.currentTurnId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  
  room.turnInfo.currentTurnId = room.players[nextIndex].id;
  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.diceCount = 6;
  
  io.to(room.id).emit('turn-updated', { turnInfo: room.turnInfo });
}

function broadcastRooms() {
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.length,
    maxPlayers: r.maxPlayers,
    gameStarted: r.gameStarted
  }));
  io.emit('room-list-update', roomList);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ... (set-nickname as before)

  socket.on('start-game', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    const room = rooms.get(player.roomId);
    if (!room) return;

    room.gameStarted = true;
    room.turnInfo.currentTurnId = room.players[0].id;
    room.turnInfo.diceCount = 6;
    
    io.to(room.id).emit('game-started', { room });
    broadcastRooms();
  });

  socket.on('roll-dice', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    room.turnInfo.rollCount++;
    const diceCount = room.turnInfo.diceCount || 6;
    const roll = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
    
    const { score, usedIndexes } = calculateScore(roll);
    
    room.turnInfo.lastRoll = roll;
    
    if (score === 0) {
      // BUST
      console.log(`Player ${player.nickname} BUSTED`);
      socket.emit('dice-rolled', { roll, score: 0, isBust: true });
      setTimeout(() => nextTurn(room), 2000);
      return;
    }

    room.turnInfo.turnPoints += score;
    
    // Zbytek kostek
    const remainingDice = diceCount - usedIndexes.length;
    room.turnInfo.diceCount = remainingDice === 0 ? 6 : remainingDice; // Hot Dice

    // Rule: Must have 350 by 3rd roll
    if (room.turnInfo.rollCount >= 3 && room.turnInfo.turnPoints < 350) {
      console.log(`Player ${player.nickname} failed 3rd roll limit (Points: ${room.turnInfo.turnPoints})`);
      socket.emit('dice-rolled', { roll, score, turnPoints: 0, isBust: true, reason: '350 limit' });
      setTimeout(() => nextTurn(room), 2000);
      return;
    }

    socket.emit('dice-rolled', { roll, score, turnPoints: room.turnInfo.turnPoints, diceCount: room.turnInfo.diceCount });
    io.to(room.id).except(socket.id).emit('opponent-rolled', { nickname: player.nickname, roll, turnPoints: room.turnInfo.turnPoints });
  });

  socket.on('stop-turn', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    if (room.turnInfo.turnPoints < 350) {
      socket.emit('nickname-error', 'Musíš mít alespoň 350 bodů pro zapsání.');
      return;
    }

    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    console.log(`Player ${player.nickname} stopped with ${room.turnInfo.turnPoints}b. Total: ${room.turnInfo.scores[socket.id]}b`);
    
    io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
    nextTurn(room);
  });

  socket.on('set-nickname', (name) => {
    const trimmedName = name.trim();
    
    // REJOIN LOGIC
    if (disconnectedPlayers.has(trimmedName)) {
      const { roomId, timeoutId } = disconnectedPlayers.get(trimmedName);
      clearTimeout(timeoutId);
      disconnectedPlayers.delete(trimmedName);

      socket.data.nickname = trimmedName;
      players.set(socket.id, { nickname: trimmedName, roomId });
      
      console.log(`Player rejoined: ${trimmedName} (${socket.id})`);
      socket.emit('rejoin-success', { nickname: trimmedName, roomId });

      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        // Aktualizovat socket id v seznamu hráčů místnosti
        const pIndex = room.players.findIndex(p => p.nickname === trimmedName);
        if (pIndex !== -1) room.players[pIndex].id = socket.id;
        
        socket.join(roomId);
        socket.emit('room-joined', { roomId, room });
      } else {
        socket.emit('nickname-set', { success: true, nickname: trimmedName });
      }
      return;
    }

    if (nicknames.has(trimmedName)) {
      socket.emit('nickname-error', 'Toto jméno je již obsazené.');
      return;
    }
    // ... rest of validation ...
    if (trimmedName.length < 3) {
      socket.emit('nickname-error', 'Jméno musí mít alespoň 3 znaky.');
      return;
    }

    nicknames.add(trimmedName);
    socket.data.nickname = trimmedName;
    players.set(socket.id, { nickname: trimmedName, roomId: null });
    console.log(`Player registered: ${trimmedName} (${socket.id})`);
    socket.emit('nickname-set', { success: true, nickname: trimmedName });
    broadcastRooms();
  });

  socket.on('create-room', (roomName) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomId = generateRoomId();
    const newRoom = {
      id: roomId,
      name: roomName || `Hra ${player.nickname}`,
      players: [{ id: socket.id, nickname: player.nickname }],
      maxPlayers: 6,
      gameStarted: false,
      turnInfo: {
        currentTurnId: socket.id,
        turnPoints: 0,
        rollCount: 0,
        scores: { [socket.id]: 0 },
        lastRoll: []
      }
    };

    rooms.set(roomId, newRoom);
    player.roomId = roomId;
    socket.join(roomId);

    console.log(`Room created: ${roomId} by ${player.nickname}`);
    socket.emit('room-joined', { roomId, room: newRoom });
    broadcastRooms();
  });

  socket.on('join-room', (roomId) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomId);

    if (!player || !room) {
      socket.emit('nickname-error', 'Místnost neexistuje.'); // Reuse error handler
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit('nickname-error', 'Místnost je již plná.');
      return;
    }

    room.players.push({ id: socket.id, nickname: player.nickname });
    room.turnInfo.scores[socket.id] = 0; // Initialize score
    player.roomId = roomId;
    socket.join(roomId);

    console.log(`Player ${player.nickname} joined room ${roomId}`);
    socket.emit('room-joined', { roomId, room });
    
    io.to(roomId).emit('player-joined', { players: room.players, room });
    broadcastRooms();
  });


  socket.on('leave-room', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    const roomId = player.roomId;
    const room = rooms.get(roomId);

    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      socket.leave(roomId);
      player.roomId = null;

      if (room.players.length === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} closed (empty)`);
      } else {
        io.to(roomId).emit('player-left', { players: room.players });
      }
      
      socket.emit('left-room');
      broadcastRooms();
    }
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      console.log(`Player disconnected (pending): ${player.nickname}`);
      
      // Delay removal for rejoin
      const timeoutId = setTimeout(() => {
        if (player.roomId) {
          const room = rooms.get(player.roomId);
          if (room) {
            room.players = room.players.filter(p => p.nickname !== player.nickname);
            if (room.players.length === 0) {
              rooms.delete(player.roomId);
            } else {
              io.to(player.roomId).emit('player-left', { players: room.players });
            }
          }
        }
        nicknames.delete(player.nickname);
        disconnectedPlayers.delete(player.nickname);
        broadcastRooms();
        console.log(`Player session expired: ${player.nickname}`);
      }, 30000); // 30 seconds for rejoin

      disconnectedPlayers.set(player.nickname, { roomId: player.roomId, timeoutId });
      players.delete(socket.id);
    }
  });
});




const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

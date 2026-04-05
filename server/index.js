import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { calculateScore } from '../shared/scoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, 'state.json');

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

function saveState() {
  try {
    const data = {
      rooms: Array.from(rooms.entries()),
      players: Array.from(players.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (data.rooms) data.rooms.forEach(([id, room]) => rooms.set(id, room));
      if (data.players) data.players.forEach(([id, player]) => players.set(id, player));
      console.log(`State loaded: ${rooms.size} rooms, ${players.size} players.`);
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }
}

loadState();

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

function nextTurn(room, bust = false) {
  const activeId = room.turnInfo.currentTurnId;
  
  if (bust) {
    // Rule 9: Increment strikes on zero score
    room.turnInfo.strikes[activeId] = (room.turnInfo.strikes[activeId] || 0) + 1;
    if (room.turnInfo.strikes[activeId] >= 3) {
      room.turnInfo.scores[activeId] = 0;
      room.turnInfo.strikes[activeId] = 0;
      io.to(room.id).emit('strikes-reset', { playerId: activeId });
    }
  } else if (room.turnInfo.turnPoints > 0) {
    // Rule 9: Reset strikes on successful scoring
    room.turnInfo.strikes[activeId] = 0;
    room.turnInfo.enteredBoard[activeId] = true;
  }

  const currentIndex = room.players.findIndex(p => p.id === room.turnInfo.currentTurnId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  
  room.turnInfo.currentTurnId = room.players[nextIndex].id;
  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.storedDice = []; // RESET
  room.turnInfo.diceCount = 6;
  room.turnInfo.allowedIndexes = [];
  room.turnInfo.canDohodit = false; // FIXED: Prevent bleed into next turn
  
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
    const p = players.get(socket.id);
    if (!p) return;
    
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomName = name || `Hra – ${p.nickname}`;
    const room = {
      id: roomId,
      name: roomName,
      players: [{ id: socket.id, nickname: p.nickname }],
      maxPlayers: 6,
      gameStarted: false,
      turnInfo: {
        currentTurnId: socket.id,
        turnPoints: 0,
        rollCount: 0,
        scores: { [socket.id]: 0 },
        strikes: { [socket.id]: 0 },
        enteredBoard: { [socket.id]: false },
        lastRoll: [],
        storedDice: [],
        diceCount: 6,
        allowedIndexes: [],
        canDohodit: false
      }
    };
    rooms.set(roomId, room);
    p.roomId = roomId;
    socket.join(roomId);
    saveState();
    socket.emit('room-joined', { roomId, room });
    io.emit('room-list-update', getRoomList());
  });

  socket.on('join-room', (roomId) => {
    const player = players.get(socket.id);
    const room = rooms.get(roomId);
    if (!player || !room || room.players.length >= 6) return;
    
    room.players.push({ id: socket.id, nickname: player.nickname });
    room.turnInfo.scores[socket.id] = 0;
    room.turnInfo.strikes[socket.id] = 0;
    room.turnInfo.enteredBoard[socket.id] = false;
    player.roomId = roomId;
    socket.join(roomId);
    saveState();
    socket.emit('room-joined', { roomId, room });
    io.to(roomId).emit('player-joined', { players: room.players });
    io.emit('room-list-update', getRoomList());
  });

  socket.on('start-game', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (room && room.players[0].id === socket.id) {
      room.gameStarted = true;
      saveState();
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
    
    // Pass isFirstRoll flag to detect Straight/Pairs
    const { score, usedIndexes, canDohodit } = calculateScore(roll, room.turnInfo.rollCount === 1);
    room.turnInfo.allowedIndexes = usedIndexes;

    const isBust = (score === 0);
    const totalPotential = room.turnInfo.turnPoints + score;
    
    // Rule 3: 3rd roll threshold (STRICT: Must have 350 by 3rd roll every turn)
    const isTooLowAfter3 = (room.turnInfo.rollCount === 3 && totalPotential < 350);

    if (isBust || isTooLowAfter3) {
      const msg = isBust ? "SMŮLA, ZKUS TO PŘÍŠTĚ!" : "MÁLO BODŮ (LIMIT 350)!";
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        msg,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice
      });
      setTimeout(() => nextTurn(room, true), 1500);
    } else {
      // Store the canDohodit state in turnInfo so it persists until next action
      room.turnInfo.canDohodit = room.turnInfo.rollCount === 1 ? canDohodit : false;
      
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints, 
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: usedIndexes,
        canDohodit: room.turnInfo.canDohodit
      });
    }
  });

  socket.on('dohodit', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || !room.turnInfo.canDohodit) return;

    // Rule 13: Freeze 5, roll chybějící (1)
    room.turnInfo.rollCount++;
    const roll = [Math.floor(Math.random() * 6) + 1];
    // Create virtual 6-dice set: 5 from last roll (unique ones) + 1 new
    const lastRoll = room.turnInfo.lastRoll;
    const counts = {}; lastRoll.forEach(v => counts[v] = (counts[v]||0)+1);
    
    // Extract the 5 unique/needed dice
    let baseDice = [];
    let comboName = "";
    if (new Set(lastRoll).size === 5) {
      baseDice = Array.from(new Set(lastRoll));
      comboName = "POSTUPKU";
    } else {
      baseDice = lastRoll.slice(0, 5); 
      comboName = "PÁRY";
    }
    
    const virtualDice = [...baseDice, ...roll];
    const { score, usedIndexes } = calculateScore(virtualDice, true); 

    // Success if we got the full 6-dice combo (all dice used)
    const success = (usedIndexes.length === 6);

    if (success) {
      room.turnInfo.turnPoints = score;
      room.turnInfo.lastRoll = virtualDice;
      room.turnInfo.diceCount = 0; // Trigger "Do plných" automatically
      room.turnInfo.canDohodit = false;
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll: virtualDice, 
        turnPoints: score,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: [0,1,2,3,4,5] 
      });
    } else {
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        msg: "SMŮLA, ZKUS TO PŘÍŠTĚ!",
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice
      });
      setTimeout(() => nextTurn(room, true), 1500);
    }
  });

  socket.on('update-selection', (indices) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room) return;
    socket.to(room.id).emit('selection-updated', { playerId: socket.id, indices });
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
    const selectedDiceValues = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
    room.turnInfo.storedDice = [...(room.turnInfo.storedDice || []), ...selectedDiceValues];
    
    const rem = room.turnInfo.diceCount - selectedIndexes.length;
    room.turnInfo.diceCount = rem === 0 ? 6 : rem;
    if (rem === 0) room.turnInfo.storedDice = []; // Do plných (reset visuals)

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;

    const { score: nextScore, usedIndexes } = calculateScore(roll, room.turnInfo.rollCount === 1);
    room.turnInfo.allowedIndexes = usedIndexes;
    const totalPotential = room.turnInfo.turnPoints + nextScore;
    
    // Rule 3: 3rd roll threshold (STRICT: Must have 350 by 3rd roll every turn)
    const isTooLowAfter3 = (room.turnInfo.rollCount === 3 && totalPotential < 350);

    if (nextScore === 0 || isTooLowAfter3) {
      const msg = nextScore === 0 ? "SMŮLA, ZKUS TO PŘÍŠTĚ!" : "MÁLO BODŮ (LIMIT 350)!";
      io.to(room.id).emit('dice-rolled', { roll, isBust: true, msg });
      setTimeout(() => nextTurn(room, true), 1500);
    } else {
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: usedIndexes 
      });
    }
  });

  socket.on('stop-turn', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    const rem = room.turnInfo.diceCount - (selectedIndexes?.length || 0);
    if (rem === 0) {
      socket.emit('nickname-error', 'Máš odložené všechny kostky! Musíš hodit další hod (přesně podle pravidla 7).');
      return;
    }

    if (selectedIndexes.length > 0) {
      const selectedPoints = (selectedIndexes.length > 0 && room.turnInfo.lastRoll.length >= selectedIndexes.length)
    ? calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]).filter(v => v !== undefined), room.turnInfo.rollCount === 1).score 
    : 0;
      room.turnInfo.turnPoints += selectedPoints;
    }

    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    
    if (room.turnInfo.scores[socket.id] >= 10000) {
      // Převést skóre z socket ID na přezdívky pro přehledné zobrazení ve VictoryModal
      const namedScores = {};
      room.players.forEach(p => {
        namedScores[p.nickname] = room.turnInfo.scores[p.id] ?? 0;
      });
      io.to(room.id).emit('game-over', { winner: players.get(socket.id).nickname, scores: namedScores });
      rooms.delete(room.id);
      io.emit('room-list-update', getRoomList());
    } else {
      io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
      nextTurn(room);
    }
    saveState();
  });

  socket.on('send-reaction', (emoji) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      io.to(player.roomId).emit('reaction-received', { emoji, playerId: socket.id });
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
      saveState();
      broadcastGlobalStats();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

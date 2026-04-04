import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateScore } from './utils/scoring.js';

function detectNearlySpecial(dice) {
  const counts = {};
  dice.forEach(v => counts[v] = (counts[v] || 0) + 1);
  const uniqueValues = Object.keys(counts).map(Number);
  
  if (dice.length !== 6) return null;

  // 1. Nearly Postupka (1-6)
  if (uniqueValues.length === 5) {
    const missingValue = [1,2,3,4,5,6].find(v => !uniqueValues.includes(v));
    const duplicateValue = uniqueValues.find(v => counts[v] === 2);
    const frozenDice = [];
    let removed = false;
    dice.forEach(v => {
      if (v === duplicateValue && !removed) {
        removed = true;
      } else {
        frozenDice.push(v);
      }
    });

    return { type: 'postupka', frozenDice, missingValue };
  }

  // 2. Nearly Tři páry
  const pairs = uniqueValues.filter(v => counts[v] === 2);
  if (pairs.length === 2 && uniqueValues.length === 4) {
    const singletons = uniqueValues.filter(v => counts[v] === 1);
    const targetValue = singletons[0];
    const leaveValue = singletons[1];
    
    const frozenDice = dice.filter((v, i) => {
      const firstLeaveIndex = dice.indexOf(leaveValue);
      return i !== firstLeaveIndex;
    });

    return { type: 'pary', frozenDice, missingValue: targetValue };
  }

  return null;
}

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
  room.turnInfo.isHotDice = false;
  
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
        strikes: { [socket.id]: 0 },
        lastRoll: [],
        diceCount: 6,
        allowedIndexes: [],
        isHotDice: false
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
    room.turnInfo.strikes[socket.id] = 0;
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
    
    // Specials only allowed on first roll (rollCount 1) or after Hot Dice
    const canHaveSpecials = room.turnInfo.rollCount === 1 || room.turnInfo.isHotDice;
    const { score, usedIndexes } = calculateScore(roll, canHaveSpecials);
    
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isHotDice = false;

    if (score === 0) {
      // Bust: add strike
      room.turnInfo.strikes[socket.id] = (room.turnInfo.strikes[socket.id] || 0) + 1;
      let scorePenalty = false;
      if (room.turnInfo.strikes[socket.id] >= 3) {
        room.turnInfo.scores[socket.id] = 0; // Reset total score
        room.turnInfo.strikes[socket.id] = 0; // Reset strikes
        scorePenalty = true;
      }
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        strikes: room.turnInfo.strikes,
        scorePenalty 
      });
      setTimeout(() => nextTurn(room), 1500);
    } else {
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints, 
        allowedIndexes: usedIndexes,
        strikes: room.turnInfo.strikes
      });

      // Task 6.3: Detect nearly special on 1st roll
      if (room.turnInfo.rollCount === 1) {
        const nearly = detectNearlySpecial(roll);
        if (nearly) {
          room.turnInfo.nearlySpecial = nearly;
          io.to(room.id).emit('can-complete-special', {
            type: nearly.type,
            frozenDice: nearly.frozenDice,
            missingValue: nearly.missingValue,
            currentRoll: roll
          });
        }
      }
    }
  });

  socket.on('roll-again', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    if (!selectedIndexes || selectedIndexes.length === 0) return;

    const selectedDice = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
    const { score } = calculateScore(selectedDice);

    if (score === 0) {
      socket.emit('stop-error', 'Vybrané kostky nemají body. Vyber platné kostky.');
      return;
    }

    room.turnInfo.turnPoints += score;
    const rem = room.turnInfo.diceCount - selectedIndexes.length;
    
    if (rem === 0) {
      // Hot Dice!
      room.turnInfo.diceCount = 6;
      room.turnInfo.isHotDice = true;
    } else {
      room.turnInfo.diceCount = rem;
      room.turnInfo.isHotDice = false;
    }

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;
    
    // Specials only allowed on first roll (unlikely here) or after Hot Dice
    const canHaveSpecials = room.turnInfo.isHotDice; 
    const { score: nextScore, usedIndexes } = calculateScore(roll, canHaveSpecials);
    
    room.turnInfo.allowedIndexes = usedIndexes;
    // Note: isHotDice stays true until the next roll is processed (in the sense of detection, but here we reset it after the roll)
    room.turnInfo.isHotDice = false; 

    if (nextScore === 0) {
      // Bust: add strike
      room.turnInfo.strikes[socket.id] = (room.turnInfo.strikes[socket.id] || 0) + 1;
      let scorePenalty = false;
      if (room.turnInfo.strikes[socket.id] >= 3) {
        room.turnInfo.scores[socket.id] = 0;
        room.turnInfo.strikes[socket.id] = 0;
        scorePenalty = true;
      }
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        strikes: room.turnInfo.strikes,
        scorePenalty 
      });
      setTimeout(() => nextTurn(room), 1500);
    } else {
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints, 
        allowedIndexes: usedIndexes,
        strikes: room.turnInfo.strikes
      });
    }
  });

  socket.on('stop-turn', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    const extraScoreData = calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]), false);
    const extraScore = extraScoreData.score;
    const finalTurnPoints = room.turnInfo.turnPoints + extraScore;

    if (room.turnInfo.isHotDice) {
      socket.emit('stop-error', 'Musíš hodit — jdeš do plných!');
      return;
    }

    if (finalTurnPoints < 350) {
      socket.emit('stop-error', `Musíš mít alespoň 350b pro ukončení tahu. Máš jen ${finalTurnPoints}b.`);
      return;
    }

    room.turnInfo.turnPoints = finalTurnPoints;
    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    room.turnInfo.strikes[socket.id] = 0; // Reset strikes on successful turn
    
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
  });

  socket.on('accept-completion', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || !room.turnInfo.nearlySpecial) return;

    const { frozenDice, missingValue } = room.turnInfo.nearlySpecial;
    const finalDie = Math.floor(Math.random() * 6) + 1;
    const fullRoll = [...frozenDice, finalDie];
    
    room.turnInfo.nearlySpecial = null;
    room.turnInfo.lastRoll = fullRoll;

    if (finalDie === missingValue) {
      // Success! Recalculate with specials allowed
      const { score, usedIndexes } = calculateScore(fullRoll, true);
      room.turnInfo.allowedIndexes = usedIndexes;
      io.to(room.id).emit('completion-result', { success: true, roll: fullRoll, allowedIndexes: usedIndexes });
    } else {
      // Failure: Bust + strike
      room.turnInfo.strikes[socket.id] = (room.turnInfo.strikes[socket.id] || 0) + 1;
      let scorePenalty = false;
      if (room.turnInfo.strikes[socket.id] >= 3) {
        room.turnInfo.scores[socket.id] = 0;
        room.turnInfo.strikes[socket.id] = 0;
        scorePenalty = true;
      }
      io.to(room.id).emit('completion-result', { 
        success: false, 
        roll: fullRoll, 
        strikes: room.turnInfo.strikes,
        scorePenalty 
      });
      setTimeout(() => nextTurn(room), 2000);
    }
  });

  socket.on('decline-completion', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    room.turnInfo.nearlySpecial = null;
    // Just a confirmation, client continues with current roll
    socket.emit('completion-declined');
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

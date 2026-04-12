import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Client, Databases, Query } from 'node-appwrite';
import { calculateScore } from '../shared/scoring.js';
import { initAppwrite } from './init-appwrite.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, 'state.json');

// Initialize Appwrite Server SDK
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DB_ID = process.env.APPWRITE_DB_ID;
const COLL_ID = process.env.APPWRITE_COLLECTION_ID;

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
let globalChat = [];
let maintenanceMode = false;

function saveState() {
  try {
    const data = {
      rooms: Array.from(rooms.entries()),
      players: Array.from(players.entries()),
      maintenanceMode
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
      if (data.players) {
        data.players.forEach(([id, player]) => {
          // Reset online status and roomId on boot to prevent ghost players
          players.set(id, { ...player, online: false, roomId: null, disconnectTime: null });
        });
      }
      if (data.maintenanceMode !== undefined) maintenanceMode = data.maintenanceMode;
      console.log(`State loaded: ${rooms.size} rooms, ${players.size} players. Maintenance: ${maintenanceMode}`);
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }
}

loadState();
await initAppwrite();

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

function broadcastLeaderboard() {
  (async () => {
    try {
      const result = await databases.listDocuments(DB_ID, COLL_ID, [
        Query.limit(10)
      ]);
      const list = result.documents.map(d => ({
        nickname: d.nickname,
        wins: d.wins || 0,
        total_points: d.total_points || 0,
        games_played: d.games_played || 0,
        highScore: d.highScore || 0
      })).sort((a, b) => b.highScore - a.highScore);
      io.emit('leaderboard-update', list);
    } catch (e) {
      console.error("Leaderboard Sync Error:", e.message);
    }
  })();
}

function sendRoomState(socket, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    socket.emit('room-joined', { room });
  }
}

function broadcastGlobalStats() {
  const onlinePlayers = Array.from(players.values())
    .filter(p => p.online)
    .map(p => p.nickname);
    
  io.emit('global-stats-update', {
    onlineCount: onlinePlayers.length,
    players: onlinePlayers,
    maintenanceMode
  });
}

function checkDoubleScore(room) {
  if (!room.config?.doubleScoreEnabled) return false;
  const now = Date.now();
  if (room.status.doubleEndsAt > now) {
    return true;
  }
  if (room.status.doubleScoreActive) {
    room.status.doubleScoreActive = false;
    io.to(room.id).emit('double-status-update', { active: false });
  }
  return false;
}

function nextTurn(room, bust = false) {
  const activeId = room.turnInfo.currentTurnId;
  
  if (bust) {
    room.turnInfo.strikes[activeId] = (room.turnInfo.strikes[activeId] || 0) + 1;
    if (room.turnInfo.strikes[activeId] >= 3) {
      room.turnInfo.scores[activeId] = 0;
      room.turnInfo.strikes[activeId] = 0;
      io.to(room.id).emit('strikes-reset', { playerId: activeId });
    }
  } else if (room.turnInfo.turnPoints > 0) {
    room.turnInfo.strikes[activeId] = 0;
    room.turnInfo.enteredBoard[activeId] = true;
  }

  const currentIndex = room.players.findIndex(p => p.id === room.turnInfo.currentTurnId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  
  room.status.turnsInRound++;
  if (room.status.turnsInRound >= room.players.length) {
    room.status.turnsInRound = 0;
    room.status.roundCount++;
  }

  room.turnInfo.currentTurnId = room.players[nextIndex].id;
  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.storedDice = [];
  room.turnInfo.diceCount = 6;
  room.turnInfo.allowedIndexes = [];
  
  io.to(room.id).emit('turn-updated', { turnInfo: room.turnInfo });
}

function processDoubleScoreLogic(room) {
  if (!room.config?.doubleScoreEnabled) return;
  if (!room.status.doubleScoreActive) {
    room.status.totalRolls = (room.status.totalRolls || 0) + 1;
    const interval = room.config.doubleInterval || 10;
    const remaining = interval - (room.status.totalRolls % interval);
    
    if (room.status.totalRolls > 0 && remaining === interval) {
      // Trigger it!
      room.status.doubleScoreActive = true;
      room.status.doubleEndsAt = Date.now() + (room.config.doubleDuration * 1000);
      io.to(room.id).emit('double-status-update', { 
        active: true, 
        endsAt: room.status.doubleEndsAt,
        duration: room.config.doubleDuration,
        justTriggered: true,
        remaining: 0
      });
      // Delay processing scores slightly maybe?
    } else {
      io.to(room.id).emit('double-status-update', { active: false, remaining });
    }
  }
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('request-room-sync', () => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      sendRoomState(socket, player.roomId);
      console.log(`Sync sent to ${player.nickname} (${socket.id})`);
    }
  });

  socket.on('set-nickname', (nickname) => {
    if (!nickname || nickname.trim().length < 3) {
      socket.emit('nickname-error', 'Jméno musí mít aspoň 3 znaky.');
      return;
    }

    const nicknameLower = nickname.toLowerCase();
    const existingPlayerEntry = Array.from(players.entries()).find(([id, p]) => 
      id !== socket.id && p.nickname.toLowerCase() === nicknameLower
    );

    if (existingPlayerEntry) {
      const [oldId, oldPlayer] = existingPlayerEntry;
      
      if (oldPlayer.online) {
        const oldSocket = io.sockets.sockets.get(oldId);
        if (oldSocket) {
          oldSocket.emit('nickname-error', 'Byl jsi odpojen, protože ses přihlásil odjinud.');
          oldSocket.disconnect(true);
        }
      }

      const roomId = oldPlayer.roomId;
      players.delete(oldId);
      players.set(socket.id, { ...oldPlayer, online: true, disconnectTime: null });

      socket.emit('nickname-set', oldPlayer.nickname);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.players = room.players.map(p => p.id === oldId ? { ...p, id: socket.id } : p);
          if (room.turnInfo.currentTurnId === oldId) room.turnInfo.currentTurnId = socket.id;
          
          // Re-map scores and strikes keys to new socket ID
          if (room.turnInfo.scores[oldId] !== undefined) {
             room.turnInfo.scores[socket.id] = room.turnInfo.scores[oldId];
             delete room.turnInfo.scores[oldId];
          }
          if (room.turnInfo.strikes[oldId] !== undefined) {
             room.turnInfo.strikes[socket.id] = room.turnInfo.strikes[oldId];
             delete room.turnInfo.strikes[oldId];
          }
          if (room.turnInfo.enteredBoard[oldId] !== undefined) {
             room.turnInfo.enteredBoard[socket.id] = room.turnInfo.enteredBoard[oldId];
             delete room.turnInfo.enteredBoard[oldId];
          }
          
          socket.join(roomId);
          sendRoomState(socket, roomId);
          io.to(roomId).emit('player-connection-status', { id: socket.id, nickname: oldPlayer.nickname, online: true });
        }
      }
      broadcastLeaderboard();
      socket.emit('global-chat-update', globalChat);
      broadcastGlobalStats();
      io.emit('room-list-update', getRoomList());
      return;
    }

    (async () => {
      try {
        const list = await databases.listDocuments(DB_ID, COLL_ID, [
          Query.equal('nickname', nickname)
        ]);
        if (list.total === 0) {
          await databases.createDocument(DB_ID, COLL_ID, 'unique()', {
            nickname: nickname,
            wins: 0,
            total_points: 0,
            games_played: 0,
            highScore: 0
          });
        }
      } catch (e) {
        console.error("Appwrite Profile Ensure Error:", e.message);
      }
    })();

    players.set(socket.id, { nickname, roomId: null, online: true, maxTurnScore: 0 });
    socket.emit('nickname-set', nickname);
    socket.emit('room-list-update', getRoomList());
    socket.emit('global-chat-update', globalChat);
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
      socket.emit('global-chat-update', globalChat);
    }
  });

  socket.on('create-room', (data) => {
    const p = players.get(socket.id);
    if (!p) return;
    
    // Handle both old (string name) and new (object) format
    const name = typeof data === 'string' ? data : data.name;
    const config = typeof data === 'object' ? data.config : { doubleScoreEnabled: false };

    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomName = name || `Hra – ${p.nickname}`;
    const room = {
      id: roomId,
      name: roomName,
      players: [{ id: socket.id, nickname: p.nickname, maxTurnScore: 0 }],
      maxPlayers: 6,
      gameStarted: false,
      config: {
        doubleScoreEnabled: config?.doubleScoreEnabled || false,
        doubleInterval: parseInt(config?.doubleInterval) || 5, // rounds
        doubleDuration: parseInt(config?.doubleDuration) || 30, // seconds
        thiefModeEnabled: config?.thiefModeEnabled || false
      },
      status: {
        doubleScoreActive: false,
        doubleEndsAt: 0,
        roundCount: 0,
        turnsInRound: 0,
        totalRolls: 0
      },
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
        chat: [],
        isStraight: false
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
    if (!player) return;
    if (!room) {
      socket.emit('room-error', 'Místnost nebyla nalezena.');
      return;
    }
    if (room.gameStarted) {
      socket.emit('nickname-error', 'Tato hra již začala. Nelze se připojit.');
      return;
    }
    if (room.players.length >= 6) return;
    
    room.players.push({ id: socket.id, nickname: player.nickname, maxTurnScore: 0 });
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

  socket.on('dohodit', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;

    processDoubleScoreLogic(room);

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;
    
    let { score, usedIndexes, isStraight } = calculateScore(roll, room.turnInfo.rollCount === 1);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight || false;

    const isBust = (score === 0);
    const totalPotential = room.turnInfo.turnPoints + score;
    
    const isTooLowAfter3 = (room.turnInfo.rollCount === 3 && totalPotential < 350);

    if (isBust || isTooLowAfter3) {
      const msg = isBust ? "SMŮLA, ZKUS TO PŘÍŠTĚ!" : "MÁLO BODŮ (LIMIT 350)!";
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        msg,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        isStraight: false
      });
      setTimeout(() => nextTurn(room, true), 1500);
    } else {
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints, 
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: usedIndexes,
        isStraight: room.turnInfo.isStraight
      });
    }
  });

  socket.on('roll-dice', () => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    
    processDoubleScoreLogic(room);

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;
    
    let { score, usedIndexes, isStraight } = calculateScore(roll, room.turnInfo.rollCount === 1);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight || false;

    const isBust = (score === 0);
    const totalPotential = room.turnInfo.turnPoints + score;
    
    const isTooLowAfter3 = (room.turnInfo.rollCount === 3 && totalPotential < 350);

    if (isBust || isTooLowAfter3) {
      const msg = isBust ? "SMŮLA, ZKUS TO PŘÍŠTĚ!" : "MÁLO BODŮ (LIMIT 350)!";
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        isBust: true, 
        msg,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        isStraight: false
      });
      setTimeout(() => nextTurn(room, true), 1500);
    } else {
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints, 
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: usedIndexes,
        isStraight: room.turnInfo.isStraight
      });
    }
  });

  socket.on('force-straight', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || player.nickname.toLowerCase() !== 'zakladatel') return;
    
    // Reset to first roll for best test
    room.turnInfo.rollCount = 1;
    room.turnInfo.diceCount = 6;
    room.turnInfo.storedDice = [];
    
    const roll = [1, 2, 3, 4, 5, 6]; // FORCE STRAIGHT
    room.turnInfo.lastRoll = roll;
    
    let { score, usedIndexes, isStraight } = calculateScore(roll, true);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight;
    
    saveState();
    io.to(room.id).emit('dice-rolled', { 
      roll, 
      turnPoints: room.turnInfo.turnPoints, 
      rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount,
      storedDice: room.turnInfo.storedDice,
      allowedIndexes: usedIndexes,
      isStraight: room.turnInfo.isStraight
    });
  socket.on('force-fours', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || player.nickname.toLowerCase() !== 'zakladatel') return;
    
    room.turnInfo.rollCount++;
    const roll = [4, 4, 4, 4, 1, 5]; 
    room.turnInfo.lastRoll = roll;
    
    let { score, usedIndexes, isStraight } = calculateScore(roll, room.turnInfo.rollCount === 1);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight || false;
    
    saveState();
    io.to(room.id).emit('dice-rolled', { 
      roll, 
      turnPoints: room.turnInfo.turnPoints, 
      rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount,
      storedDice: room.turnInfo.storedDice,
      allowedIndexes: usedIndexes,
      isStraight: room.turnInfo.isStraight
    });
  });

  socket.on('update-selection', (indices) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room) return;
    socket.to(room.id).emit('selection-updated', { playerId: socket.id, indices });
  });

  socket.on('steal-points', ({ targetId }) => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    if (!room.config.thiefModeEnabled) return;
    if (!room.turnInfo.isStraight) {
       socket.emit('nickname-error', 'Nemáš postupku na ukradení bodů!');
       return;
    }

    const target = room.players.find(p => p.id === targetId);
    if (!target || target.id === socket.id) return;

    // Steal 1000 points
    const amount = 1000;
    room.turnInfo.scores[targetId] = Math.max(0, (room.turnInfo.scores[targetId] || 0) - amount);
    room.turnInfo.scores[socket.id] = (room.turnInfo.scores[socket.id] || 0) + amount;

    // Log to chat
    const msg = {
      id: Date.now(),
      sender: 'SYSTEM',
      text: `${player.nickname} ukradl 1000 bodů hráči ${target.nickname}!`,
      time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    };
    room.turnInfo.chat = [...(room.turnInfo.chat || []), msg].slice(-50);
    io.to(room.id).emit('chat-message-received', msg);
    
    io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
    
    // Clear turn points (as they chose theft over points)
    room.turnInfo.turnPoints = 0; 
    
    saveState();
    nextTurn(room);
  });

  socket.on('roll-again', (selectedIndexes) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id) return;
    if (!selectedIndexes || selectedIndexes.length === 0) return;
    
    processDoubleScoreLogic(room);

    const selectedDice = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
    const isFirstRoll = (room.turnInfo.rollCount === 1);
    let { score } = calculateScore(selectedDice, isFirstRoll);
    if (checkDoubleScore(room)) score *= 2;

    if (score === 0) {
      socket.emit('nickname-error', 'Vybrané kostky nemají body. Vyber platné kostky.');
      return;
    }

    room.turnInfo.turnPoints += score;
    const selectedDiceValues = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
    room.turnInfo.storedDice = [...(room.turnInfo.storedDice || []), ...selectedDiceValues];
    
    const rem = room.turnInfo.diceCount - selectedIndexes.length;
    room.turnInfo.diceCount = rem === 0 ? 6 : rem;
    if (rem === 0) room.turnInfo.storedDice = []; 

    room.turnInfo.rollCount++;
    const roll = Array.from({ length: room.turnInfo.diceCount }, () => Math.floor(Math.random() * 6) + 1);
    room.turnInfo.lastRoll = roll;

    let { score: nextScore, usedIndexes, isStraight: nextIsStraight } = calculateScore(roll, room.turnInfo.rollCount === 1);
    if (checkDoubleScore(room)) nextScore *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = nextIsStraight || false;
    const totalPotential = room.turnInfo.turnPoints + nextScore;
    
    const isTooLowAfter3 = (room.turnInfo.rollCount === 3 && totalPotential < 350);

    if (nextScore === 0 || isTooLowAfter3) {
      const msg = nextScore === 0 ? "SMŮLA, ZKUS TO PŘÍŠTĚ!" : "MÁLO BODŮ (LIMIT 350)!";
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
      saveState();
      io.to(room.id).emit('dice-rolled', { 
        roll, 
        turnPoints: room.turnInfo.turnPoints,
        rollCount: room.turnInfo.rollCount,
        diceCount: room.turnInfo.diceCount,
        storedDice: room.turnInfo.storedDice,
        allowedIndexes: usedIndexes,
        isStraight: room.turnInfo.isStraight
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
      const isFirstRoll = (room.turnInfo.rollCount === 1);
      let selectedPoints = (selectedIndexes.length > 0 && room.turnInfo.lastRoll.length >= selectedIndexes.length)
    ? calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]).filter(v => v !== undefined), isFirstRoll).score 
    : 0;
      if (checkDoubleScore(room)) selectedPoints *= 2;
      room.turnInfo.turnPoints += selectedPoints;
    }

    const pObj = room.players.find(p => p.id === socket.id);
    if (pObj) {
      pObj.maxTurnScore = Math.max(pObj.maxTurnScore || 0, room.turnInfo.turnPoints);
    }

    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    
    if (room.turnInfo.scores[socket.id] >= 10000) {
      const winnerId = socket.id;
      const winnerName = players.get(winnerId).nickname;
      
      io.to(room.id).emit('game-over', { winner: winnerName, scores: room.turnInfo.scores });

      (async () => {
        try {
          for (const p of room.players) {
            const pList = await databases.listDocuments(DB_ID, COLL_ID, [Query.equal('nickname', p.nickname)]);
            if (pList.total > 0) {
              const doc = pList.documents[0];
              const isWinner = (p.id === winnerId);
              await databases.updateDocument(DB_ID, COLL_ID, doc.$id, {
                wins: (doc.wins || 0) + (isWinner ? 1 : 0),
                total_points: (doc.total_points || 0) + room.turnInfo.scores[p.id],
                games_played: (doc.games_played || 0) + 1,
                highScore: Math.max(doc.highScore || 0, p.maxTurnScore || 0)
              });
            }
          }
        } catch (e) {
          console.error("Appwrite Game Over Sync Error:", e.message);
        } finally {
          broadcastLeaderboard();
        }
      })();

      rooms.delete(room.id);
      io.emit('room-list-update', getRoomList());
    } else {
      io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
      nextTurn(room);
    }
    saveState();
  });

  socket.on('send-global-chat', (text) => {
    const player = players.get(socket.id);
    if (player && text && text.trim().length > 0) {
      const msg = {
        id: Date.now(),
        sender: player.nickname,
        text: text.trim().substring(0, 150),
        time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
      };
      globalChat = [...globalChat, msg].slice(-50);
      io.emit('global-chat-update', globalChat);
      saveState();
    }
  });

  socket.on('admin-reset-scoreboard', async () => {
    const player = players.get(socket.id);
    if (!player || player.nickname.toLowerCase() !== 'zakladatel') return;

    try {
      let offset = 0;
      let deleted = 0;
      while (true) {
        const list = await databases.listDocuments(DB_ID, COLL_ID, [Query.limit(100), Query.offset(offset)]);
        if (list.documents.length === 0) break;
        for (const doc of list.documents) {
          await databases.deleteDocument(DB_ID, COLL_ID, doc.$id);
          deleted++;
        }
        if (list.documents.length < 100) break;
        offset += 100;
      }
      console.log(`[ADMIN] Scoreboard reset: ${deleted} záznamů smazáno.`);
      socket.emit('admin-action-result', { ok: true, message: `Scoreboard byl resetován. Smazáno ${deleted} záznamů.` });
      broadcastLeaderboard();
    } catch (e) {
      console.error('[ADMIN] Reset scoreboard error:', e.message);
      socket.emit('admin-action-result', { ok: false, message: 'Chyba při resetování: ' + e.message });
    }
  });

  // --- WebRTC Signaling ---
  socket.on('webrtc-voice-status', (isOn) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (!room) return;
    socket.to(room.id).emit('webrtc-voice-status', { userId: socket.id, isOn });
  });

  socket.on('webrtc-discover-reply', ({ targetId }) => {
    io.to(targetId).emit('webrtc-discover-reply', { senderId: socket.id });
  });

  socket.on('webrtc-offer', ({ targetId, offer }) => {
    io.to(targetId).emit('webrtc-offer', { senderId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ targetId, answer }) => {
    io.to(targetId).emit('webrtc-answer', { senderId: socket.id, answer });
  });

  socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => {
    io.to(targetId).emit('webrtc-ice-candidate', { senderId: socket.id, candidate });
  });
  // ------------------------

  socket.on('send-chat-message', (text) => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (room && text && text.trim().length > 0) {
      const msg = {
        id: Date.now(),
        sender: player.nickname,
        text: text.trim().substring(0, 200),
        time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
      };
      room.turnInfo.chat = [...(room.turnInfo.chat || []), msg].slice(-50);
      io.to(room.id).emit('chat-message-received', msg);
      saveState();
    }
  });

  socket.on('leave-room', () => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = rooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(player.roomId);
        } else {
          io.to(player.roomId).emit('player-left', { players: room.players });
        }
        player.roomId = null;
        socket.leave(room.id);
        socket.emit('left-room');
        io.emit('room-list-update', getRoomList());
        saveState();
      }
    }
  });

  socket.on('send-reaction', (emoji) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      io.to(player.roomId).emit('reaction-received', { emoji, playerId: socket.id });
    }
  });

  socket.on('update-room-config', (config) => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = rooms.get(player.roomId);
      if (room && !room.gameStarted && room.players.length > 0 && room.players[0].nickname === player.nickname) {
        room.config = { ...room.config, ...config };
        io.to(player.roomId).emit('room-update', { players: room.players, room: room }); 
        saveState();
      }
    }
  });

  socket.on('toggle-maintenance', (status) => {
    const player = players.get(socket.id);
    if (!player || player.nickname !== 'zakladatel') return;

    maintenanceMode = !!status;
    saveState();
    
    io.emit('maintenance-status', maintenanceMode);
    broadcastGlobalStats();

    if (maintenanceMode) {
      players.forEach((p, sid) => {
        if (p.nickname !== 'zakladatel') {
           if (p.roomId) {
              const room = rooms.get(p.roomId);
              if (room) {
                 room.players = room.players.filter(rp => rp.id !== sid);
                 if (room.players.length === 0) rooms.delete(p.roomId);
              }
              p.roomId = null;
           }
           io.to(sid).emit('kicked-to-lobby', 'Probíhá údržba systému.');
        }
      });
      io.emit('room-list-update', getRoomList());
    }
    console.log(`Admin 'zakladatel' changed maintenance mode to: ${maintenanceMode}`);
  });

  socket.on('admin-kick-player', (targetNickname) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname !== 'zakladatel') return;

    const targetEntry = Array.from(players.entries()).find(([id, p]) => p.nickname === targetNickname && p.online);
    if (targetEntry) {
      const [targetId, targetPlayer] = targetEntry;
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('kicked-to-lobby', 'Byl jsi vyhozen zakladatelem.');
        targetSocket.disconnect(true);
      }
      console.log(`Admin 'zakladatel' kicked player: ${targetNickname}`);
    }
  });

  socket.on('admin-delete-room', (roomId) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname !== 'zakladatel') return;

    const room = rooms.get(roomId);
    if (room) {
      io.to(roomId).emit('kicked-to-lobby', 'Místnost byla zrušena zakladatelem.');
      room.players.forEach(p => {
        const playerObj = players.get(p.id);
        if (playerObj) playerObj.roomId = null;
        const s = io.sockets.sockets.get(p.id);
        if (s) s.leave(roomId);
      });
      rooms.delete(roomId);
      saveState();
      io.emit('room-list-update', getRoomList());
      console.log(`Admin 'zakladatel' deleted room: ${roomId}`);
    }
  });

  socket.on('admin-clear-chat', () => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname !== 'zakladatel') return;

    globalChat = [];
    io.emit('global-chat-update', globalChat);
    saveState();
    console.log(`Admin 'zakladatel' cleared global chat`);
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      player.online = false;
      player.disconnectTime = Date.now();
      
      if (player.roomId) {
        const room = rooms.get(player.roomId);
        if (room) {
           io.to(player.roomId).emit('player-connection-status', { 
             id: socket.id, 
             nickname: player.nickname, 
             online: false 
           });
        }
      }
      broadcastGlobalStats();

      setTimeout(() => {
        const p = players.get(socket.id);
        if (p && !p.online) {
          if (p.roomId) {
            const room = rooms.get(p.roomId);
            if (room) {
              room.players = room.players.filter(p_item => p_item.id !== socket.id);
              if (room.players.length === 0) rooms.delete(p.roomId);
              else io.to(p.roomId).emit('player-left', { players: room.players });
              io.emit('room-list-update', getRoomList());
            }
          }
          players.delete(socket.id);
          saveState();
          broadcastGlobalStats();
        }
      }, 300000); 
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  broadcastLeaderboard();
});

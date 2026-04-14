import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Client, Databases, Query, ID } from 'node-appwrite';
import { calculateScore } from '../shared/scoring.js';
import { initAppwrite } from './init-appwrite.js';
import { getBotDecision } from './bot-logic.js';

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
  const distPath = path.resolve(__dirname, '../client/dist');
  console.log(`[SERVER] Production mode. Serving static files from: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`[SERVER] ERROR: Static folder not found at ${distPath}`);
  }

  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`[SERVER] ERROR: index.html not found at ${indexPath}`);
      res.status(404).send('404: Frontend build missing. Please run build.');
    }
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
let appVersion = '1.2';
let changelogHistory = [];

function saveState() {
  try {
    const data = {
      rooms: Array.from(rooms.entries()),
      players: Array.from(players.entries()),
      maintenanceMode,
      appVersion,
      changelogHistory
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

async function loadState() {
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
      if (data.appVersion) appVersion = data.appVersion;
      if (data.changelogHistory) changelogHistory = data.changelogHistory;
      console.log(`State loaded locally: ${rooms.size} rooms, ${players.size} players. Maintenance: ${maintenanceMode}, Version: ${appVersion}`);
    } catch (e) {
      console.error('Error loading state:', e);
    }
  }

  // Load Changelog from Appwrite (overwrites local if exists)
  try {
    const list = await databases.listDocuments(DB_ID, 'changelog', [
        Query.orderDesc('$createdAt'),
        Query.limit(20)
    ]);
    if (list.total > 0) {
        changelogHistory = list.documents.map(d => ({
            id: d.$id,
            version: d.version,
            text: d.text,
            date: d.date
        }));
        appVersion = changelogHistory[0].version;
        console.log(`Appwrite: Loaded ${list.total} changelog entries.`);
    }
  } catch (err) {
    console.warn("Appwrite Changelog Load Warning:", err.message);
  }

  // Load Feedback from Appwrite
  try {
    const list = await databases.listDocuments(DB_ID, 'feedback', [
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]);
    if (list.total > 0) {
      globalChat = list.documents.map(d => ({
        id: d.$id,
        sender: d.sender,
        title: d.title || '',
        text: d.text,
        type: d.type,
        time: d.date
      })).reverse();
      console.log(`Appwrite: Loaded ${list.total} feedback entries.`);
    }
  } catch (err) {
    console.warn("Appwrite Feedback Load Warning:", err.message);
  }
}

await loadState();
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
    playerNames: r.players.map(p => p.nickname),
    config: r.config
  }));
}

function broadcastLeaderboard(targetSocket = null) {
  (async () => {
    try {
      const result = await databases.listDocuments(DB_ID, COLL_ID, [
        Query.limit(50) 
      ]);
      const list = result.documents
        .map(d => ({
          nickname: d.nickname,
          wins: d.wins || 0,
          total_points: d.total_points || 0,
          games_played: d.games_played || 0,
          total_rolls: d.total_rolls || 0,
          highScore: d.highScore || 0
        }))
        .filter(p => p.nickname.toLowerCase() !== 'admin'); // Neobrazovat admina v leaderboardu
      
      if (targetSocket) {
        targetSocket.emit('leaderboard-update', list);
      } else {
        io.emit('leaderboard-update', list);
      }
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
  
  if (bust && room.players.find(p => p.id === activeId)) {
    room.turnInfo.strikes[activeId] = (room.turnInfo.strikes[activeId] || 0) + 1;
    if (room.turnInfo.strikes[activeId] >= 3) {
      room.turnInfo.scores[activeId] = 0;
      room.turnInfo.strikes[activeId] = 0;
      io.to(room.id).emit('strikes-reset', { playerId: activeId });
    }
  } else if (room.turnInfo.turnPoints > 0 && room.players.find(p => p.id === activeId)) {
    room.turnInfo.strikes[activeId] = 0;
    room.turnInfo.enteredBoard[activeId] = true;
  }

  const currentIndex = room.players.findIndex(p => p.id === room.turnInfo.currentTurnId);
  
  if (room.players.length > 0) {
    if (currentIndex === -1) {
      room.turnInfo.currentTurnId = room.players[0].id;
    } else {
      const nextIndex = (currentIndex + 1) % room.players.length;
      room.turnInfo.currentTurnId = room.players[nextIndex].id;
    }
  }

  room.status.turnsInRound++;
  if (room.status.turnsInRound >= room.players.length) {
    room.status.turnsInRound = 0;
    room.status.roundCount++;
  }

  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.storedDice = [];
  room.turnInfo.diceCount = 6;
  room.turnInfo.allowedIndexes = [];
  
  io.to(room.id).emit('turn-updated', { turnInfo: room.turnInfo });

  // Bot Logic Integration
  const nextPlayer = room.players.find(p => p.id === room.turnInfo.currentTurnId);
  if (nextPlayer && nextPlayer.isBot) {
    setTimeout(() => executeBotMove(room, nextPlayer.id), 1500);
  }
}

function executeBotMove(room, botId) {
  if (room.turnInfo.currentTurnId !== botId || !room.gameStarted) return;

  const botPlayer = room.players.find(p => p.id === botId);
  const strategy = botPlayer?.strategy || 'average';
  const allowedIndexes = room.turnInfo.allowedIndexes || [];
  const allowedCount = allowedIndexes.length;
  
  // Calculate potential points if we take all allowed dice
  const roll = room.turnInfo.lastRoll || [];
  let currentScoring = calculateScore(allowedIndexes.map(i => roll[i]), room.turnInfo.rollCount === 1).score;
  if (checkDoubleScore(room)) currentScoring *= 2;
  const potentialPoints = room.turnInfo.turnPoints + currentScoring;
  const remainingDice = room.turnInfo.diceCount - allowedCount;

  const decision = getBotDecision(potentialPoints, remainingDice, room.turnInfo.rollCount, strategy, allowedCount);
  
  if (decision === 'roll' || room.turnInfo.rollCount === 0) {
    // Bot Simulates Roll
    botTriggerRoll(room, botId);
  } else {
    // Bot Simulates Stop
    botTriggerStop(room, botId);
  }
}

function botTriggerRoll(room, botId) {
    if (room.turnInfo.rollCount > 0 && room.turnInfo.allowedIndexes.length > 0) {
        // Bot automatically selects ALL valid dice
        const selectedIndexes = room.turnInfo.allowedIndexes;
        setTimeout(() => {
          handleRollAgain(room, botId, selectedIndexes);
        }, 1500);
    } else {
        handleDiceRoll(room, botId);
    }
}

function botTriggerStop(room, botId) {
    handleStopTurn(room, botId, room.turnInfo.allowedIndexes || []);
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
    } else {
      io.to(room.id).emit('double-status-update', { active: false, remaining });
    }
  }
}

function handlePlayerLeave(socketId, roomId) {
  const room = rooms.get(roomId);
  const player = players.get(socketId);
  if (!room || !player) return;

  const creatorId = room.players.length > 0 ? room.players[0].id : null;
  const isCreator = creatorId === socketId;
  const isGameStarted = room.gameStarted;

  // Remove player from room
  room.players = room.players.filter(p => p.id !== socketId);
  player.roomId = null;

  if (room.players.length === 0) {
    // Rule: Pokud hru opustí všichni, hra se smaže
    rooms.delete(roomId);
  } else if (!isGameStarted && isCreator) {
    // Rule: Lobby se odstraní, když ji opustí tvůrce (pokud hra nezačala)
    io.to(roomId).emit('kicked-to-lobby', 'Tvůrce opustil místnost, hra byla zrušena.');
    room.players.forEach(p => {
       const pObj = players.get(p.id);
       if (pObj) pObj.roomId = null;
       const s = io.sockets.sockets.get(p.id);
       if (s) s.leave(roomId);
    });
    rooms.delete(roomId);
  } else if (isGameStarted && room.players.length < 2) {
    // Rule: Pokud v rozehrané hře zbude méně než 2 hráči, hra se ukončí
    io.to(roomId).emit('kicked-to-lobby', 'Ve hře zbyl méně než 2 hráči. Hra byla ukončena.');
    room.players.forEach(p => {
       const pObj = players.get(p.id);
       if (pObj) pObj.roomId = null;
       const s = io.sockets.sockets.get(p.id);
       if (s) s.leave(roomId);
    });
    rooms.delete(roomId);
  } else {
    // Rule: Pokud kdokoli (včetně tvůrce) opustí rozehranou hru a zbývá 2+ hráčů
    io.to(roomId).emit('player-left', { players: room.players });
    
    // If it was the current turn, move to next
    if (room.turnInfo.currentTurnId === socketId) {
      nextTurn(room);
    }
  }

  io.emit('room-list-update', getRoomList());
  saveState();
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Send current maintenance status immediately
  socket.emit('maintenance-status', maintenanceMode);

  socket.on('request-room-sync', () => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      sendRoomState(socket, player.roomId);
      console.log(`Sync sent to ${player.nickname} (${socket.id})`);
    }
  });

  socket.on('set-nickname', (data) => {
    const nickname = typeof data === 'string' ? data : data?.nickname;
    const password = typeof data === 'object' ? data?.password : null;

    if (!nickname || nickname.trim().length < 3) {
      socket.emit('nickname-error', 'Jméno musí mít aspoň 3 znaky.');
      return;
    }

    const nicknameLower = nickname.trim().toLowerCase();
    
    // Admin Password Check
    if (nicknameLower === 'admin' && password !== 'kostky01') {
       socket.emit('nickname-error', 'Špatné admin heslo.');
       return;
    }

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
    socket.emit('app-version-update', appVersion);
    socket.emit('changelog-update', changelogHistory);
    broadcastLeaderboard(socket);
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
    
    // Rule 1: Stejný hráč nemůže založit více her najednou
    const existingRoom = Array.from(rooms.values()).find(r => r.players.length > 0 && r.players[0].id === socket.id);
    if (existingRoom) {
      socket.emit('nickname-error', 'Již jsi vytvořil jednu hru. Nemůžeš mít více her najednou.');
      return;
    }

    const name = typeof data === 'string' ? data : data.name;
    const config = typeof data === 'object' ? data.config : { doubleScoreEnabled: false };
    const withBot = typeof data === 'object' ? data.withBot : false;

    const roomId = generateRoomId();
    const roomName = name || (withBot ? `Zápas s Botem` : `Hra – ${p.nickname}`);
    globalChat = []; // Vymazáno na žádost
    const room = {
      id: roomId,
      name: roomName,
      players: [{ id: socket.id, nickname: p.nickname, maxTurnScore: 0 }],
      maxPlayers: 6,
      gameStarted: false,
      config: {
        doubleScoreEnabled: config?.doubleScoreEnabled || false,
        doubleInterval: parseInt(config?.doubleInterval) || 5,
        doubleDuration: parseInt(config?.doubleDuration) || 30,
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
        isStraight: false,
        playerRolls: { [socket.id]: 0 }
      }
    };

    if (withBot) {
      const botId = `bot_${Math.random().toString(36).substring(2, 7)}`;
      const botNick = `BOT ${['Radovan', 'Hrbatý', 'Štístko', 'Smolař'][Math.floor(Math.random()*4)]} 🤖`;
      room.players.push({ id: botId, nickname: botNick, isBot: true, maxTurnScore: 0 });
      room.turnInfo.scores[botId] = 0;
      room.turnInfo.strikes[botId] = 0;
      room.turnInfo.enteredBoard[botId] = false;
      room.turnInfo.playerRolls[botId] = 0;
    }

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
    
    if (room.players.find(p => p.id === socket.id)) return;

    room.players.push({ id: socket.id, nickname: player.nickname, maxTurnScore: 0 });
    room.turnInfo.scores[socket.id] = 0;
    room.turnInfo.strikes[socket.id] = 0;
    room.turnInfo.enteredBoard[socket.id] = false;
    room.turnInfo.playerRolls[socket.id] = 0;
    player.roomId = roomId;
    socket.join(roomId);
    saveState();
    socket.emit('room-joined', { roomId, room });
    io.to(roomId).emit('player-joined', { players: room.players });
    io.emit('room-list-update', getRoomList());
  });

  socket.on('add-bot', (strategy) => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (room && room.players[0].id === socket.id && room.players.length < 6) {
      const type = strategy || 'average';
      const botId = `bot_${Math.random().toString(36).substring(2, 7)}`;
      const typeLabel = { cautious: 'Opatrný', average: 'Průměrný', gambler: 'Gambler' }[type];
      const bot = { 
        id: botId, 
        nickname: `BOT ${typeLabel} 🤖`, 
        isBot: true,
        strategy: type,
        maxTurnScore: 0 
      };
      room.players.push(bot);
      room.turnInfo.scores[botId] = 0;
      room.turnInfo.strikes[botId] = 0;
      room.turnInfo.enteredBoard[botId] = false;
      room.turnInfo.playerRolls[botId] = 0;
      
      io.to(room.id).emit('player-joined', { players: room.players });
      io.emit('room-list-update', getRoomList());
    }
  });

  socket.on('roll-dice', () => {
    handleDiceRoll(rooms.get(players.get(socket.id)?.roomId), socket.id);
  });

  socket.on('dohodit', () => {
    handleDiceRoll(rooms.get(players.get(socket.id)?.roomId), socket.id);
  });

  socket.on('force-straight', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || player.nickname.toLowerCase() !== 'admin') return;
    room.turnInfo.rollCount = 1;
    room.turnInfo.diceCount = 6;
    room.turnInfo.storedDice = [];
    const roll = [1, 2, 3, 4, 5, 6];
    room.turnInfo.lastRoll = roll;
    let { score, usedIndexes, isStraight } = calculateScore(roll, true);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight;
    saveState();
    io.to(room.id).emit('dice-rolled', { 
      roll, turnPoints: room.turnInfo.turnPoints, rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount, storedDice: room.turnInfo.storedDice,
      allowedIndexes: usedIndexes, isStraight: room.turnInfo.isStraight
    });
  });

  socket.on('force-fours', () => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (!room || room.turnInfo.currentTurnId !== socket.id || player.nickname.toLowerCase() !== 'admin') return;
    room.turnInfo.rollCount++;
    const roll = [4, 4, 4, 4, 1, 5]; 
    room.turnInfo.lastRoll = roll;
    let { score, usedIndexes, isStraight } = calculateScore(roll, room.turnInfo.rollCount === 1);
    if (checkDoubleScore(room)) score *= 2;
    room.turnInfo.allowedIndexes = usedIndexes;
    room.turnInfo.isStraight = isStraight || false;
    saveState();
    io.to(room.id).emit('dice-rolled', { 
      roll, turnPoints: room.turnInfo.turnPoints, rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount, storedDice: room.turnInfo.storedDice,
      allowedIndexes: usedIndexes, isStraight: room.turnInfo.isStraight
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
    const amount = 1000;
    room.turnInfo.scores[targetId] = Math.max(0, (room.turnInfo.scores[targetId] || 0) - amount);
    room.turnInfo.scores[socket.id] = (room.turnInfo.scores[socket.id] || 0) + amount;
    const msg = {
      id: Date.now(), sender: 'SYSTEM', text: `${player.nickname} ukradl 1000 bodů hráči ${target.nickname}!`,
      time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    };
    room.turnInfo.chat = [...(room.turnInfo.chat || []), msg].slice(-50);
    io.to(room.id).emit('chat-message-received', msg);
    io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
    room.turnInfo.turnPoints = 0; 
    saveState();
    nextTurn(room);
  });

  socket.on('roll-again', (selectedIndexes) => {
    handleRollAgain(rooms.get(players.get(socket.id)?.roomId), socket.id, selectedIndexes, (err) => {
        socket.emit('nickname-error', err);
    });
  });

  socket.on('stop-turn', (selectedIndexes) => {
    handleStopTurn(rooms.get(players.get(socket.id)?.roomId), socket.id, selectedIndexes, (err) => {
        socket.emit('nickname-error', err);
    });
  });

  socket.on('send-global-chat', (data) => {
    const player = players.get(socket.id);
    const text = typeof data === 'string' ? data : data.text;
    const title = data.title || '';
    const type = data.type || 'feature';

    if (player && text && text.trim().length > 0) {
      const timeStr = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      const msg = {
        id: Date.now(),
        sender: player.nickname,
        title: title.trim().substring(0, 200),
        text: text.trim().substring(0, 1000),
        type: type,
        time: timeStr
      };

      globalChat = [...globalChat, msg].slice(-100);
      io.emit('global-chat-update', globalChat);
      
      // Save to Appwrite
      (async () => {
        try {
          await databases.createDocument(DB_ID, 'feedback', ID.unique(), {
            sender: player.nickname,
            title: msg.title,
            text: msg.text,
            type: type,
            date: timeStr
          });
        } catch (e) {
          console.error("Appwrite Feedback Save Error:", e.message);
        }
      })();

      saveState();
    }
  });

  socket.on('admin-reset-scoreboard', async () => {
    const player = players.get(socket.id);
    if (!player || player.nickname.toLowerCase() !== 'admin') return;
    try {
      let offset = 0; let deleted = 0;
      while (true) {
        const list = await databases.listDocuments(DB_ID, COLL_ID, [Query.limit(100), Query.offset(offset)]);
        if (list.documents.length === 0) break;
        for (const doc of list.documents) { await databases.deleteDocument(DB_ID, COLL_ID, doc.$id); deleted++; }
        if (list.documents.length < 100) break;
        offset += 100;
      }
      socket.emit('admin-action-result', { ok: true, message: `Scoreboard resetován. Smazáno ${deleted} záznamů.` });
      broadcastLeaderboard();
    } catch (e) { socket.emit('admin-action-result', { ok: false, message: 'Chyba: ' + e.message }); }
  });

  socket.on('webrtc-voice-status', (isOn) => {
    const room = rooms.get(players.get(socket.id)?.roomId);
    if (room) socket.to(room.id).emit('webrtc-voice-status', { userId: socket.id, isOn });
  });

  socket.on('webrtc-discover-reply', ({ targetId }) => io.to(targetId).emit('webrtc-discover-reply', { senderId: socket.id }));
  socket.on('webrtc-offer', ({ targetId, offer }) => io.to(targetId).emit('webrtc-offer', { senderId: socket.id, offer }));
  socket.on('webrtc-answer', ({ targetId, answer }) => io.to(targetId).emit('webrtc-answer', { senderId: socket.id, answer }));
  socket.on('webrtc-ice-candidate', ({ targetId, candidate }) => io.to(targetId).emit('webrtc-ice-candidate', { senderId: socket.id, candidate }));

  socket.on('send-chat-message', (text) => {
    const player = players.get(socket.id);
    const room = rooms.get(player?.roomId);
    if (room && text && text.trim().length > 0) {
      const msg = {
        id: Date.now(), sender: player.nickname, text: text.trim().substring(0, 200),
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
      handlePlayerLeave(socket.id, player.roomId);
      socket.leave(player.roomId);
      socket.emit('left-room');
    }
  });

  socket.on('send-reaction', (emoji) => {
    const player = players.get(socket.id);
    if (player && player.roomId) io.to(player.roomId).emit('reaction-received', { emoji, playerId: socket.id });
  });

  socket.on('start-game', () => {
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = rooms.get(player.roomId);
      if (room && !room.gameStarted && room.players.length > 0 && room.players[0].nickname === player.nickname) {
        if (room.players.length < 2) {
          socket.emit('error', 'Hra vyžaduje alespoň 2 hráče.');
          return;
        }
        room.gameStarted = true;
        // Reset scores and turn info
        room.turnInfo = { 
          ...room.turnInfo, 
          scores: {}, 
          strikes: {}, 
          enteredBoard: {}, 
          playerRolls: {},
          currentTurnId: room.players[0].id, 
          diceCount: 6, 
          lastRoll: [], 
          rollCount: 0, 
          turnPoints: 0, 
          chat: room.turnInfo.chat || [] 
        };
        room.players.forEach(p => {
          room.turnInfo.scores[p.id] = 0;
          room.turnInfo.strikes[p.id] = 0;
          room.turnInfo.playerRolls[p.id] = 0;
          room.turnInfo.enteredBoard[p.id] = false;
        });
        io.to(player.roomId).emit('game-started', { room });
        saveState();
      }
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
    if (!player || player.nickname.toLowerCase() !== 'admin') return;
    maintenanceMode = !!status;
    saveState();
    io.emit('maintenance-status', maintenanceMode);
    broadcastGlobalStats();
    if (maintenanceMode) {
      players.forEach((p, sid) => {
        if (p.nickname.toLowerCase() !== 'admin') {
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
  });

  socket.on('admin-kick-player', (targetNickname) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname.toLowerCase() !== 'admin') return;
    const targetEntry = Array.from(players.entries()).find(([id, p]) => p.nickname === targetNickname && p.online);
    if (targetEntry) {
      const [targetId] = targetEntry;
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('kicked-to-lobby', 'Byl jsi vyhozen zakladatelem.');
        targetSocket.disconnect(true);
      }
    }
  });

  socket.on('admin-delete-room', (roomId) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname.toLowerCase() !== 'admin') return;
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
    }
  });

  socket.on('admin-update-changelog', ({ version, text }) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname.toLowerCase() !== 'admin') return;
    
    // Nový záznam na začátek
    const newEntry = {
      id: ID.unique(), // Dočasné ID pro lokální stav před uložením
      version: version || appVersion,
      text: text || '',
      date: new Date().toLocaleDateString('cs-CZ')
    };
    
    changelogHistory = [newEntry, ...changelogHistory].slice(0, 20); // Limit 20 entries
    appVersion = newEntry.version;
    
    // Save to Appwrite
    (async () => {
        try {
            const doc = await databases.createDocument(DB_ID, 'changelog', ID.unique(), {
                version: newEntry.version,
                text: newEntry.text,
                date: newEntry.date
            });
            // Aktualizujeme lokální ID na to skutečné z Appwrite
            newEntry.id = doc.$id;
        } catch (e) {
            console.error("Appwrite Changelog Save Error:", e.message);
        }
    })();

    saveState();
    io.emit('app-version-update', appVersion);
    io.emit('changelog-update', changelogHistory);
  });

  socket.on('admin-edit-changelog', ({ id, version, text }) => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname.toLowerCase() !== 'admin') return;

    const idx = changelogHistory.findIndex(e => e.id === id);
    if (idx === -1) return;

    changelogHistory[idx].version = version;
    changelogHistory[idx].text = text;

    // Pokud upravujeme nejnovější, aktualizuj appVersion
    if (idx === 0) appVersion = version;

    // Save to Appwrite
    (async () => {
        try {
            await databases.updateDocument(DB_ID, 'changelog', id, {
                version,
                text
            });
        } catch (e) {
            console.error("Appwrite Changelog Edit Error:", e.message);
        }
    })();

    saveState();
    io.emit('app-version-update', appVersion);
    io.emit('changelog-update', changelogHistory);
  });

  socket.on('admin-clear-chat', () => {
    const admin = players.get(socket.id);
    if (!admin || admin.nickname.toLowerCase() !== 'admin') return;
    globalChat = [];
    io.emit('global-chat-update', globalChat);
    saveState();
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (player) {
      player.online = false;
      player.disconnectTime = Date.now();
      
      const roomId = player.roomId;
      let handledImmediately = false;

      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          // Rule: Pokud zakladatel opustí lobby ještě před startem, zrušíme to hned
          const isCreator = room.players.length > 0 && room.players[0].id === socket.id;
          if (!room.gameStarted && isCreator) {
            console.log(`[DISCONNECT] Creator ${player.nickname} left lobby. Deleting room ${roomId} immediately.`);
            handlePlayerLeave(socket.id, roomId);
            handledImmediately = true;
          } else {
            io.to(roomId).emit('player-connection-status', { id: socket.id, nickname: player.nickname, online: false });
          }
        }
      }
      
      broadcastGlobalStats();

      // Pokud již nebylo vyřešeno hned (např. běžná hra nebo hráč v lobby), čekáme 5 minut na návrat
      if (!handledImmediately) {
        setTimeout(() => {
          const p = players.get(socket.id);
          if (p && !p.online) {
            if (p.roomId) handlePlayerLeave(socket.id, p.roomId);
            players.delete(socket.id);
            saveState();
            broadcastGlobalStats();
          }
        }, 300000); 
      } else {
        players.delete(socket.id);
        saveState();
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  broadcastLeaderboard();
});

// --- HELPER FUNCTIONS FOR GAME LOGIC ---

function handleDiceRoll(room, playerId) {
  if (!room || room.turnInfo.currentTurnId !== playerId) return;

  processDoubleScoreLogic(room);

  room.turnInfo.rollCount++;
  room.turnInfo.playerRolls[playerId] = (room.turnInfo.playerRolls[playerId] || 0) + 1;
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
      roll, isBust: true, msg, rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount, storedDice: room.turnInfo.storedDice, isStraight: false
    });
    setTimeout(() => nextTurn(room, true), 4000);
  } else {
    saveState();
    io.to(room.id).emit('dice-rolled', { 
      roll, turnPoints: room.turnInfo.turnPoints, rollCount: room.turnInfo.rollCount,
      diceCount: room.turnInfo.diceCount, storedDice: room.turnInfo.storedDice,
      allowedIndexes: usedIndexes, isStraight: room.turnInfo.isStraight
    });

    // CRITICAL: If it's a bot, trigger next decision
    const nextPlayer = room.players.find(p => p.id === room.turnInfo.currentTurnId);
    if (nextPlayer && nextPlayer.isBot) {
       setTimeout(() => executeBotMove(room, nextPlayer.id), 2000);
    }
  }
}

function handleRollAgain(room, playerId, selectedIndexes, onError) {
  if (!room || room.turnInfo.currentTurnId !== playerId) return;
  if (!selectedIndexes || selectedIndexes.length === 0) return;
  processDoubleScoreLogic(room);
  const selectedDice = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
  const isFirstRoll = (room.turnInfo.rollCount === 1);
  let { score } = calculateScore(selectedDice, isFirstRoll);
  if (checkDoubleScore(room)) score *= 2;
  if (score === 0) {
    if (onError) onError('Vybrané kostky nemají body. Vyber platné kostky.');
    return;
  }
  room.turnInfo.turnPoints += score;
  const selectedDiceValues = selectedIndexes.map(i => room.turnInfo.lastRoll[i]);
  room.turnInfo.storedDice = [...(room.turnInfo.storedDice || []), ...selectedDiceValues];
  const rem = room.turnInfo.diceCount - selectedIndexes.length;
  room.turnInfo.diceCount = rem === 0 ? 6 : rem;
  if (rem === 0) room.turnInfo.storedDice = []; 
  
  handleDiceRoll(room, playerId);
}

function handleStopTurn(room, playerId, selectedIndexes, onError) {
    if (!room || room.turnInfo.currentTurnId !== playerId) return;
    const rem = room.turnInfo.diceCount - (selectedIndexes?.length || 0);
    if (rem === 0) {
      if (onError) onError('Máš odložené všechny kostky! Musíš hodit další hod (přesně podle pravidla 7).');
      return;
    }
    if (selectedIndexes && selectedIndexes.length > 0) {
      const isFirstRoll = (room.turnInfo.rollCount === 1);
      let selectedPoints = calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]).filter(v => v !== undefined), isFirstRoll).score;
      if (checkDoubleScore(room)) selectedPoints *= 2;
      room.turnInfo.turnPoints += selectedPoints;
    }
    const pObj = room.players.find(p => p.id === playerId);
    if (pObj) pObj.maxTurnScore = Math.max(pObj.maxTurnScore || 0, room.turnInfo.turnPoints);
    room.turnInfo.scores[playerId] += room.turnInfo.turnPoints;
    
    if (room.turnInfo.scores[playerId] >= 10000) {
      const winnerId = playerId;
      const winnerName = room.players.find(p => p.id === winnerId).nickname;
      io.to(room.id).emit('game-over', { winner: winnerName, scores: room.turnInfo.scores });
      
      (async () => {
        try {
          for (const p of room.players) {
            if (p.isBot) continue; 
            const pList = await databases.listDocuments(DB_ID, COLL_ID, [Query.equal('nickname', p.nickname)]);
            if (pList.total > 0) {
              const doc = pList.documents[0];
              const isWinner = (p.id === winnerId);
              await databases.updateDocument(DB_ID, COLL_ID, doc.$id, {
                wins: (doc.wins || 0) + (isWinner ? 1 : 0),
                total_points: (doc.total_points || 0) + room.turnInfo.scores[p.id],
                games_played: (doc.games_played || 0) + 1,
                total_rolls: (doc.total_rolls || 0) + (room.turnInfo.playerRolls[p.id] || 0),
                highScore: Math.max(doc.highScore || 0, p.maxTurnScore || 0)
              });
            }
          }
        } catch (e) { console.error("Appwrite Game Over Error:", e.message); }
        finally { broadcastLeaderboard(); }
      })();
      rooms.delete(room.id);
      io.emit('room-list-update', getRoomList());
    } else {
      io.to(room.id).emit('score-updated', { scores: room.turnInfo.scores });
      nextTurn(room);
    }
    saveState();
}


















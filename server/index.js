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
      if (data.players) data.players.forEach(([id, player]) => players.set(id, player));
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
        Query.orderDesc('wins'),
        Query.limit(10)
      ]);
      const list = result.documents.map(d => ({
        nickname: d.nickname,
        wins: d.wins || 0,
        total_points: d.total_points || 0,
        games_played: d.games_played || 0
      }));
      io.emit('leaderboard-update', list);
    } catch (e) {
      console.error("Leaderboard Sync Error:", e.message);
    }
  })();
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
  
  room.turnInfo.currentTurnId = room.players[nextIndex].id;
  room.turnInfo.turnPoints = 0;
  room.turnInfo.rollCount = 0;
  room.turnInfo.lastRoll = [];
  room.turnInfo.storedDice = [];
  room.turnInfo.diceCount = 6;
  room.turnInfo.allowedIndexes = [];
  
  io.to(room.id).emit('turn-updated', { turnInfo: room.turnInfo });
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

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
          const oldScore = room.turnInfo.scores[oldId];
          delete room.turnInfo.scores[oldId];
          room.turnInfo.scores[socket.id] = oldScore;
          
          socket.join(roomId);
          socket.emit('room-joined', { room });
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

    players.set(socket.id, { nickname, roomId: null, online: true });
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
        chat: []
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
    if (!player || !room) return;
    if (room.gameStarted) {
      socket.emit('nickname-error', 'Tato hra již začala. Nelze se připojit.');
      return;
    }
    if (room.players.length >= 6) return;
    
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
    
    const { score, usedIndexes } = calculateScore(roll, room.turnInfo.rollCount === 1);
    room.turnInfo.allowedIndexes = usedIndexes;

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
        allowedIndexes: usedIndexes
      });
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
    const isFirstRoll = (room.turnInfo.rollCount === 1);
    const { score } = calculateScore(selectedDice, isFirstRoll);

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

    const { score: nextScore, usedIndexes } = calculateScore(roll, room.turnInfo.rollCount === 1);
    room.turnInfo.allowedIndexes = usedIndexes;
    const totalPotential = room.turnInfo.turnPoints + nextScore;
    
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
      const isFirstRoll = (room.turnInfo.rollCount === 1);
      const selectedPoints = (selectedIndexes.length > 0 && room.turnInfo.lastRoll.length >= selectedIndexes.length)
    ? calculateScore(selectedIndexes.map(i => room.turnInfo.lastRoll[i]).filter(v => v !== undefined), isFirstRoll).score 
    : 0;
      room.turnInfo.turnPoints += selectedPoints;
    }

    room.turnInfo.scores[socket.id] += room.turnInfo.turnPoints;
    
    if (room.turnInfo.scores[socket.id] >= 10000) {
      const winnerName = players.get(socket.id).nickname;
      const namedScores = {};
      room.players.forEach(p => {
        namedScores[p.nickname] = room.turnInfo.scores[p.id] ?? 0;
      });
      io.to(room.id).emit('game-over', { winner: winnerName, scores: namedScores });

      (async () => {
        try {
          const winList = await databases.listDocuments(DB_ID, COLL_ID, [Query.equal('nickname', winnerName)]);
          if (winList.total > 0) {
            const doc = winList.documents[0];
            await databases.updateDocument(DB_ID, COLL_ID, doc.$id, {
              wins: (doc.wins || 0) + 1,
              total_points: (doc.total_points || 0) + room.turnInfo.scores[socket.id],
              games_played: (doc.games_played || 0) + 1
            });
          }

          for (const p of room.players) {
            if (p.id === socket.id) continue;
            const pList = await databases.listDocuments(DB_ID, COLL_ID, [Query.equal('nickname', p.nickname)]);
            if (pList.total > 0) {
              const doc = pList.documents[0];
              await databases.updateDocument(DB_ID, COLL_ID, doc.$id, {
                total_points: (doc.total_points || 0) + room.turnInfo.scores[p.id],
                games_played: (doc.games_played || 0) + 1
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

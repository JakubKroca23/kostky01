import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import NicknameScreen from './components/NicknameScreen';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import VictoryModal from './components/VictoryModal';
import Navbar from './components/Navbar';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AdminMenu from './components/AdminMenu';
import { audio } from './utils/audio';
import { account } from './lib/appwrite';

const isProd = import.meta.env.PROD;
const socket = io(isProd ? undefined : 'http://localhost:3001', {
  reconnectionAttempts: 10,
  transports: ['polling', 'websocket']
});

socket.on('connect_error', (err) => {
  console.error('Socket Connection Error:', err.message);
});

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [screen, setScreen] = useState('loading'); // 'loading', 'nickname', 'lobby', 'room'
  const [nickname, setNickname] = useState(localStorage.getItem('kostky-nickname') || '');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [remoteSelection, setRemoteSelection] = useState([]);
  const [onlineStats, setOnlineStats] = useState({ onlineCount: 0, players: [] });
  const [globalChat, setGlobalChat] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [error, setError] = useState('');
  const [winnerData, setWinnerData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('kostky-sound') !== 'false';
    audio.setEnabled(saved);
    return saved;
  });

  const nicknameRef = useRef(nickname);
  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);

  useEffect(() => {
    async function initApp() {
      try {
        const session = await account.get();
        if (session) {
          const name = session.name || session.$id.substring(0, 8);
          setNickname(name);
          socket.emit('set-nickname', name);
          setScreen('lobby');
        } else {
          const savedNick = localStorage.getItem('kostky-nickname');
          if (savedNick) {
            setNickname(savedNick);
          }
          setScreen('nickname');
        }
      } catch (err) {
        const savedNick = localStorage.getItem('kostky-nickname');
        if (savedNick) {
          setNickname(savedNick);
        }
        setScreen('nickname');
      }
    }

    initApp();

    function onConnect() {
      setIsConnected(true);
      if (nicknameRef.current) {
        socket.emit('set-nickname', nicknameRef.current);
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNicknameSet(name) {
      setNickname(name);
      localStorage.setItem('kostky-nickname', name);
      setScreen('lobby');
      setError('');
    }

    function onNicknameError(msg) {
      setError(msg);
      if (screen === 'loading') setScreen('nickname');
    }

    function onRoomListUpdate(list) {
      setRooms(list);
    }

    function onGlobalStatsUpdate(stats) {
      setOnlineStats(stats);
    }

    function onLeaderboardUpdate(list) {
      setLeaderboard(list);
    }

    function onGlobalChatUpdate(msgs) {
      setGlobalChat(msgs);
    }

    function onLeaderboardUpdate(list) {
      setLeaderboard(list);
    }

    function onMaintenanceStatus(status) {
      setMaintenanceMode(status);
    }

    function onKickedToLobby(msg) {
      setCurrentRoom(null);
      setScreen('lobby');
      setError(msg);
    }

    function onRoomJoined(data) {
      setCurrentRoom(data.room);
      setScreen('room');
    }

    function onRoomUpdate(data) {
      setCurrentRoom(prev => {
        if (!prev) return null;
        return { ...prev, players: data.players };
      });
    }

    function onLeftRoom() {
      setCurrentRoom(null);
      setScreen('lobby');
    }

    function onGameStarted(data) {
      setCurrentRoom(data.room);
    }

    function onScoreUpdated(data) {
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { ...prev.turnInfo, scores: data.scores }
      }));
      audio.playScore();
    }

    function onTurnUpdated(data) {
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: data.turnInfo
      }));
    }

    function onDiceRolled(data) {
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: {
          ...prev.turnInfo,
          lastRoll: data.roll,
          turnPoints: data.turnPoints || prev.turnInfo.turnPoints,
          rollCount: data.rollCount,
          diceCount: data.diceCount,
          storedDice: data.storedDice,
          allowedIndexes: data.allowedIndexes || []
        }
      }));
      if (data.isBust) audio.playBust();
      else audio.playRoll();
    }

    function onGameOver(data) {
      setWinnerData(data);
      audio.playVictory();
    }

    function onReactionReceived(data) {
      burstEmojis(data.emoji);
    }

    function onChatMessageReceived(msg) {
      setCurrentRoom(prev => {
        if (!prev) return prev;
        const newChat = [...(prev.turnInfo.chat || []), msg].slice(-50);
        return {
          ...prev,
          turnInfo: { ...prev.turnInfo, chat: newChat }
        };
      });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nickname-set', onNicknameSet);
    socket.on('nickname-error', onNicknameError);
    socket.on('room-list-update', onRoomListUpdate);
    socket.on('global-stats-update', onGlobalStatsUpdate);
    socket.on('leaderboard-update', onLeaderboardUpdate);
    socket.on('global-chat-update', onGlobalChatUpdate);
    socket.on('room-joined', onRoomJoined);
    socket.on('player-joined', onRoomUpdate);
    socket.on('player-left', onRoomUpdate);
    socket.on('left-room', onLeftRoom);
    socket.on('game-started', onGameStarted);
    socket.on('score-updated', onScoreUpdated);
    socket.on('turn-updated', onTurnUpdated);
    socket.on('dice-rolled', onDiceRolled);
    socket.on('selection-updated', (data) => {
       if (data.playerId !== socket.id) setRemoteSelection(data.indices);
    });
    socket.on('game-over', onGameOver);
    socket.on('reaction-received', onReactionReceived);
    socket.on('chat-message-received', onChatMessageReceived);
    socket.on('maintenance-status', onMaintenanceStatus);
    socket.on('kicked-to-lobby', onKickedToLobby);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nickname-set', onNicknameSet);
      socket.off('nickname-error', onNicknameError);
      socket.off('room-list-update', onRoomListUpdate);
      socket.off('global-stats-update', onGlobalStatsUpdate);
      socket.off('leaderboard-update', onLeaderboardUpdate);
      socket.off('global-chat-update', onGlobalChatUpdate);
      socket.off('room-joined', onRoomJoined);
      socket.off('player-joined', onRoomUpdate);
      socket.off('player-left', onRoomUpdate);
      socket.off('left-room', onLeftRoom);
      socket.off('game-started', onGameStarted);
      socket.off('score-updated', onScoreUpdated);
      socket.off('turn-updated', onTurnUpdated);
      socket.off('dice-rolled', onDiceRolled);
      socket.off('selection-updated');
      socket.off('game-over', onGameOver);
      socket.off('reaction-received', onReactionReceived);
      socket.off('chat-message-received', onChatMessageReceived);
      socket.off('maintenance-status', onMaintenanceStatus);
      socket.off('kicked-to-lobby', onKickedToLobby);
    };
  }, []);

  const burstEmojis = (emoji) => {
    const rocket = document.createElement('span');
    rocket.className = 'firework-rocket';
    rocket.innerText = '🎆';
    document.body.appendChild(rocket);

    setTimeout(() => {
      const rocketRect = rocket.getBoundingClientRect();
      const x = rocketRect.left + rocketRect.width / 2;
      const y = rocketRect.top;

      for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'firework-particle';
        p.innerText = emoji;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        
        const tx = (Math.random() - 0.5) * 400;
        const ty = (Math.random() - 0.5) * 400;
        p.style.setProperty('--tx', `${tx}px`);
        p.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
      }
      rocket.remove();
    }, 1000);
  };

  const handleSendReaction = (emoji) => {
    socket.emit('send-reaction', emoji);
  };

  const handleSendGlobalMessage = (text) => {
    socket.emit('send-global-chat', text);
  };

  const handleSendMessage = (text) => {
    socket.emit('send-chat-message', text);
  };

  const handleBackToLobby = () => {
    setWinnerData(null);
    setScreen('lobby');
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
  };

  const handleJoinNickname = async (name) => {
    try {
      const existing = await account.get().catch(() => null);
      if (!existing) {
        await account.createAnonymousSession();
      }
      await account.updateName(name);
      socket.emit('set-nickname', name);
    } catch (err) {
      setError('Chyba při přihlašování: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      setNickname('');
      localStorage.removeItem('kostky-nickname');
      setScreen('nickname');
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCreateRoom = (roomName) => {
    socket.emit('create-room', roomName);
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('join-room', roomId);
  };

  const handleStartGame = () => {
    socket.emit('start-game');
  };

  const handleRollDice = () => {
    socket.emit('roll-dice');
  };

  const handleRollAgain = (selectedIndexes) => {
    socket.emit('roll-again', selectedIndexes);
  };

  const handleStopTurn = (selectedIndexes) => {
    socket.emit('stop-turn', selectedIndexes);
  };

  const handleChangeNickname = () => {
    const newName = prompt('Zadej nové jméno:', nickname);
    if (newName && newName.trim().length >= 3) {
      socket.emit('change-nickname', newName.trim());
    }
  };

  const handleDohodit = () => {
    socket.emit('dohodit');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    audio.setEnabled(next);
    localStorage.setItem('kostky-sound', next);
    setSoundEnabled(next);
  };

  return (
    <div className="app-container fade-in">
      {nickname && (
        <Navbar 
          nickname={nickname}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onLogout={handleLogout}
          onChangeNickname={handleChangeNickname}
          onOpenAdmin={() => setIsAdminOpen(true)}
          isAdmin={nickname?.toLowerCase() === 'zakladatel'}
        />
      )}

      {maintenanceMode && nickname?.toLowerCase() !== 'zakladatel' && (
        <MaintenanceOverlay />
      )}

      {isAdminOpen && (
        <AdminMenu 
          maintenanceMode={maintenanceMode} 
          onToggleMaintenance={(status) => socket.emit('toggle-maintenance', status)}
          onClose={() => setIsAdminOpen(false)} 
          players={onlineStats.players}
          rooms={rooms}
          onKickPlayer={(nick) => socket.emit('admin-kick-player', nick)}
          onDeleteRoom={(id) => socket.emit('admin-delete-room', id)}
          onClearChat={() => socket.emit('admin-clear-chat')}
        />
      )}

      {winnerData && (
        <VictoryModal 
          winner={winnerData.winner} 
          scores={winnerData.scores} 
          onBack={handleBackToLobby}
        />
      )}
      
      {screen === 'loading' && <div className="loading">Pripojovani...</div>}

      {error && <div className="global-error-toast glass neon-card">{error}</div>}

      {screen === 'nickname' && (
        <div className="auth-wrapper fade-in">
          <NicknameScreen 
            onJoin={handleJoinNickname} 
            error={error} 
          />
        </div>
      )}

      {screen === 'lobby' && (
        <Lobby 
          rooms={rooms} 
          nickname={nickname}
          onlineStats={onlineStats}
          globalChat={globalChat}
          leaderboard={leaderboard}
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom} 
          onChangeNickname={handleChangeNickname}
          onSendMessage={handleSendGlobalMessage}
          onReaction={handleSendReaction}
        />
      )}

      {screen === 'room' && currentRoom && (
        <GameRoom 
          room={currentRoom} 
          nickname={nickname} 
          remoteSelection={remoteSelection}
          onRoll={handleRollDice} 
          onRollAgain={handleRollAgain} 
          onStop={handleStopTurn} 
          onStart={handleStartGame} 
          onDohodit={handleDohodit}
          onSendMessage={handleSendMessage}
          onReaction={handleSendReaction}
          onLeave={handleLeaveRoom}
          onUpdateSelection={(indices) => socket.emit('update-selection', indices)}
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

export default App;

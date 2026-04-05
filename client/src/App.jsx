import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import NicknameScreen from './components/NicknameScreen';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import VictoryModal from './components/VictoryModal';
import { audio } from './utils/audio';

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
  const [error, setError] = useState('');
  const [winnerData, setWinnerData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Načíst preference zvuku z localStorage, výchozí stav je zapnuto
    const saved = localStorage.getItem('kostky-sound') !== 'false';
    audio.setEnabled(saved);
    return saved;
  });

  useEffect(() => {
    // If stuck loading for too long, fallback to nickname
    const loadTimeout = setTimeout(() => {
      if (screen === 'loading' && !nickname) setScreen('nickname');
    }, 2000);

    function onConnect() {
      setIsConnected(true);
      const stashedNick = localStorage.getItem('kostky-nickname');
      if (stashedNick) {
        socket.emit('set-nickname', stashedNick);
      } else {
        setScreen('nickname');
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
      // If we were trying to auto-login, go to login screen
      if (screen === 'loading') setScreen('nickname');
    }

    function onRoomListUpdate(list) {
      setRooms(list);
    }

    function onGlobalStatsUpdate(stats) {
      setOnlineStats(stats);
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

    function onGameStarted(data) {
      setCurrentRoom(data.room);
    }

    function onScoreUpdated(data) {
      audio.playScore();
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { ...prev.turnInfo, scores: data.scores }
      }));
    }

    function onTurnUpdated(data) {
      setRemoteSelection([]); // CRITICAL: Clear ghost selection on every turn start
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { ...prev.turnInfo, ...data.turnInfo }
      }));
    }

    function onDiceRolled(data) {
      setRemoteSelection([]); // CRITICAL: Clear ghost selection on every roll
      setCurrentRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          turnInfo: { 
            ...prev.turnInfo, 
            lastRoll: data.roll, 
            turnPoints: data.turnPoints !== undefined ? data.turnPoints : prev.turnInfo.turnPoints,
            rollCount: data.rollCount !== undefined ? data.rollCount : prev.turnInfo.rollCount,
            diceCount: data.diceCount !== undefined ? data.diceCount : prev.turnInfo.diceCount,
            storedDice: data.storedDice !== undefined ? data.storedDice : prev.turnInfo.storedDice,
            allowedIndexes: data.allowedIndexes || [],
            canDohodit: data.canDohodit || false
          }
        };
      });
      
      if (data.isBust || data.msg) {
        // Delay results until dice settle (1200ms)
        setTimeout(() => {
          if (data.isBust) audio.playBust();
          setError(data.msg || 'SMŮLA, ZKUS TO PŘÍŠTĚ!');
          setTimeout(() => setError(''), 3000);
        }, 1500);
      } else {
        audio.playRoll();
      }
    }

    function onOpponentRolled(data) {
      audio.playRoll();
       setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { 
          ...prev.turnInfo, 
          lastRoll: data.roll, 
          turnPoints: data.turnPoints,
          rollCount: (prev.turnInfo.rollCount || 0) + 1
        }
      }));
    }

    function onLeftRoom() {
      setCurrentRoom(null);
      setScreen('lobby');
    }

    function onGameOver(data) {
      audio.playVictory();
      setWinnerData(data);
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
    socket.on('room-joined', onRoomJoined);
    socket.on('player-joined', onRoomUpdate);
    socket.on('player-left', onRoomUpdate);
    socket.on('left-room', onLeftRoom);
    socket.on('game-started', onGameStarted);
    socket.on('score-updated', onScoreUpdated);
    socket.on('turn-updated', onTurnUpdated);
    function onSelectionUpdated(data) {
      if (data.playerId !== socket.id) {
        // Emit a custom event or update currentRoom turnInfo?
        // Let's just update the room's current selection state if possible
        // Actually, we can just pass this down as a prop to GameRoom
        setRemoteSelection(data.indices);
      }
    }

    socket.on('dice-rolled', onDiceRolled);
    socket.on('selection-updated', onSelectionUpdated);
    socket.on('game-over', onGameOver);
    socket.on('reaction-received', onReactionReceived);
    socket.on('chat-message-received', onChatMessageReceived);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nickname-set', onNicknameSet);
      socket.off('nickname-error', onNicknameError);
      socket.off('room-list-update', onRoomListUpdate);
      socket.off('global-stats-update', onGlobalStatsUpdate);
      socket.off('room-joined', onRoomJoined);
      socket.off('player-joined', onRoomUpdate);
      socket.off('player-left', onRoomUpdate);
      socket.off('left-room', onLeftRoom);
      socket.off('game-started', onGameStarted);
      socket.off('score-updated', onScoreUpdated);
      socket.off('turn-updated', onTurnUpdated);
      socket.off('dice-rolled', onDiceRolled);
      socket.off('game-over', onGameOver);
      socket.off('reaction-received', onReactionReceived);
      socket.off('chat-message-received', onChatMessageReceived);
    };
  }, []);

  const burstEmojis = (emoji) => {
    // 1. Launch a rocket first
    const rocket = document.createElement('span');
    rocket.className = 'firework-rocket';
    rocket.innerText = emoji; // Or maybe a 🚀 emoji
    document.body.appendChild(rocket);
    
    // 2. Explode at peak
    setTimeout(() => {
        rocket.remove();
        
        const count = 6 + Math.floor(Math.random() * 4);
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;

        for (let i = 0; i < count; i++) {
            const span = document.createElement('span');
            span.className = 'floating-emoji';
            span.innerText = emoji;
            
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 180;
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist;
            const tr = Math.random() * 180;
            
            span.style.left = `${x}px`;
            span.style.top = `${y}px`;
            span.style.setProperty('--tx', `${tx}px`);
            span.style.setProperty('--ty', `${ty}px`);
            span.style.setProperty('--tr', `${tr}deg`);
            
            span.style.animation = `explode ${1.5 + Math.random() * 0.5}s forwards cubic-bezier(0.1, 0.6, 0.2, 1)`;
            
            document.body.appendChild(span);
            setTimeout(() => span.remove(), 2000);
        }
    }, 800); // 800ms is the duration of rocketLaunch
  };

  const handleSendReaction = (emoji) => {
    socket.emit('send-reaction', emoji);
  };

  const handleSendMessage = (text) => {
    socket.emit('send-chat-message', text);
  };

  const handleBackToLobby = () => {
    setWinnerData(null);
    setScreen('lobby');
  };

  const handleJoinNickname = (name) => {
    socket.emit('set-nickname', name);
  };

  const handleCreateRoom = (roomName) => {
    socket.emit('create-room', roomName);
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('join-room', roomId);
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room');
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

  return (
    <div className="app-container fade-in">
      {winnerData && (
        <VictoryModal 
          winner={winnerData.winner} 
          scores={winnerData.scores} 
          onBack={handleBackToLobby}
        />
      )}
      {screen !== 'room' && (
        <header className="neon-header">
          <h1 className="neon-text-cyan">KOSTKY</h1>
          <div className="header-controls">
            {nickname && (
              <div className="user-info">
                <span className="nickname-display">{nickname}</span>
                <button className="neon-button btn-mini" onClick={handleChangeNickname}>Změnit</button>
              </div>
            )}
            <button 
              id="sound-toggle-btn"
              className={`sound-toggle ${soundEnabled ? 'active' : ''}`}
              onClick={() => {
                const next = !soundEnabled;
                audio.setEnabled(next);
                localStorage.setItem('kostky-sound', next);
                setSoundEnabled(next);
              }}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? 'ONLINE' : '...'}
            </div>
          </div>
        </header>
      )}
      
      {screen === 'loading' && <div className="loading">Pripojovani...</div>}

      {error && <div className="global-error-toast glass neon-card">{error}</div>}

      {screen === 'nickname' && (
        <NicknameScreen onJoin={handleJoinNickname} error={error} />
      )}

      {screen === 'lobby' && (
        <Lobby 
          rooms={rooms} 
          nickname={nickname} 
          onlineStats={onlineStats} 
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom} 
          onChangeNickname={handleChangeNickname}
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
          onUpdateSelection={(indices) => socket.emit('update-selection', indices)}
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

export default App;

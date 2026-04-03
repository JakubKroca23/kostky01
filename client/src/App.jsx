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
  const [error, setError] = useState('');
  const [winnerData, setWinnerData] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('kostky-sound') !== 'false';
  });

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      // Try to rejoin if we have a nickname
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
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { ...prev.turnInfo, ...data.turnInfo }
      }));
    }

    function onDiceRolled(data) {
      setCurrentRoom(prev => ({
        ...prev,
        turnInfo: { 
          ...prev.turnInfo, 
          lastRoll: data.roll, 
          turnPoints: data.turnPoints !== undefined ? data.turnPoints : prev.turnInfo.turnPoints,
          rollCount: prev.turnInfo.rollCount + 1,
          diceCount: data.diceCount || prev.turnInfo.diceCount,
          allowedIndexes: data.allowedIndexes || []
        }
      }));
      
      if (data.isBust) {
        audio.playBust();
        setError('ZELENÁČ! Žádné body.');
        setTimeout(() => setError(''), 3000);
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
          rollCount: prev.turnInfo.rollCount + 1
        }
      }));
    }

    function onLeftRoom() {
      setCurrentRoom(null);
      setScreen('lobby');
    }

    function onGameOver(data) {
      audio.playScore();
      setWinnerData(data);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nickname-set', onNicknameSet);
    socket.on('nickname-error', onNicknameError);
    socket.on('room-list-update', onRoomListUpdate);
    socket.on('room-joined', onRoomJoined);
    socket.on('player-joined', onRoomUpdate);
    socket.on('player-left', onRoomUpdate);
    socket.on('left-room', onLeftRoom);
    socket.on('game-started', onGameStarted);
    socket.on('score-updated', onScoreUpdated);
    socket.on('turn-updated', onTurnUpdated);
    socket.on('dice-rolled', onDiceRolled);
    socket.on('opponent-rolled', onOpponentRolled);
    socket.on('game-over', onGameOver);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nickname-set', onNicknameSet);
      socket.off('rejoin-success', onRejoinSuccess);
      socket.off('nickname-error', onNicknameError);
      socket.off('room-list-update', onRoomListUpdate);
      socket.off('room-joined', onRoomJoined);
      socket.off('player-joined', onRoomUpdate);
      socket.off('player-left', onRoomUpdate);
      socket.off('left-room', onLeftRoom);
      socket.off('game-started', onGameStarted);
      socket.off('score-updated', onScoreUpdated);
      socket.off('turn-updated', onTurnUpdated);
      socket.off('dice-rolled', onDiceRolled);
      socket.off('opponent-rolled', onOpponentRolled);
      socket.off('game-over', onGameOver);
    };
  }, []);

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

  return (
    <div className="app-container fade-in">
      {winnerData && (
        <VictoryModal 
          winner={winnerData.winner} 
          scores={winnerData.scores} 
          onBack={handleBackToLobby}
        />
      )}
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
            className={`sound-toggle ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
            {isConnected ? 'ONLINE' : '...'}
          </div>
        </div>
      </header>
      
      {screen === 'loading' && <div className="loading">Pripojovani...</div>}

      {error && <div className="global-error-toast glass neon-card">{error}</div>}

      {screen === 'nickname' && (
        <NicknameScreen onJoin={handleJoinNickname} error={error} />
      )}

      {screen === 'lobby' && (
        <Lobby 
          rooms={rooms} 
          onlineStats={onlineStats}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}

      {screen === 'room' && (
        <GameRoom 
          room={currentRoom} 
          nickname={nickname}
          onRoll={handleRollDice}
          onRollAgain={handleRollAgain}
          onStop={handleStopTurn}
          onStart={handleStartGame}
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

export default App;

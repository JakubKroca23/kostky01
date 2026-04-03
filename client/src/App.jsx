import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import NicknameScreen from './components/NicknameScreen';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';

const socket = io();

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [screen, setScreen] = useState('loading'); // 'loading', 'nickname', 'lobby', 'room'
  const [nickname, setNickname] = useState(localStorage.getItem('kostky-nickname') || '');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState('');

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

    function onNicknameSet(data) {
      if (data.success) {
        setNickname(data.nickname);
        localStorage.setItem('kostky-nickname', data.nickname);
        setScreen('lobby');
        setError('');
      }
    }

    function onRejoinSuccess(data) {
      setNickname(data.nickname);
      localStorage.setItem('kostky-nickname', data.nickname);
      setScreen(data.roomId ? 'room' : 'lobby');
    }

    function onNicknameError(msg) {
      setError(msg);
      setScreen('nickname');
    }

    function onRoomListUpdate(list) {
      setRooms(list);
    }

    function onRoomJoined(data) {
      setCurrentRoom(data.room);
      setScreen('room');
    }

    function onRoomUpdate(data) {
      setCurrentRoom(data.room || (prev => ({ ...prev, players: data.players })));
    }

    function onGameStarted(data) {
      setCurrentRoom(data.room);
    }

    function onScoreUpdated(data) {
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
          diceCount: data.diceCount || prev.turnInfo.diceCount
        }
      }));
      if (data.isBust) {
        setError(data.reason === '350 limit' ? 'Limit 350b nesplněn do 3. hodu!' : 'ZELENÁČ! Žádné body.');
        setTimeout(() => setError(''), 3000);
      }
    }

    function onOpponentRolled(data) {
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nickname-set', onNicknameSet);
    socket.on('rejoin-success', onRejoinSuccess);
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
    };
  }, []);

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

  return (
    <div className="app-container fade-in">
      <header className="neon-header">
        <h1 className="neon-text-cyan">KOSTKY 10 000</h1>
        <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'ONLINE' : 'CONNECTING...'}
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




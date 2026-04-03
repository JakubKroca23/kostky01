import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import NicknameScreen from './components/NicknameScreen';
import Lobby from './components/Lobby';

const socket = io();

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [screen, setScreen] = useState('nickname'); // 'nickname', 'lobby', 'room'
  const [nickname, setNickname] = useState('');
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNicknameSet(data) {
      if (data.success) {
        setNickname(data.nickname);
        setScreen('lobby');
        setError('');
      }
    }

    function onNicknameError(msg) {
      setError(msg);
    }

    function onRoomListUpdate(list) {
      setRooms(list);
    }

    function onRoomJoined(data) {
      setCurrentRoom(data.room);
      setScreen('room');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nickname-set', onNicknameSet);
    socket.on('nickname-error', onNicknameError);
    socket.on('room-list-update', onRoomListUpdate);
    socket.on('room-joined', onRoomJoined);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nickname-set', onNicknameSet);
      socket.off('nickname-error', onNicknameError);
      socket.off('room-list-update', onRoomListUpdate);
      socket.off('room-joined', onRoomJoined);
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

  return (
    <div className="app-container">
      <header className="neon-header">
        <h1 className="neon-text-cyan">KOSTKY 10 000</h1>
        <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'ONLINE' : 'CONNECTING...'}
        </div>
      </header>
      
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
        <main className="hero-section">
          <div className="neon-card">
            <h2>Místnost: {currentRoom?.name}</h2>
            <p>Hráči: {currentRoom?.players?.length}</p>
            <button className="neon-button" onClick={() => setScreen('lobby')}>ZPĚT DO LOBBY</button>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;



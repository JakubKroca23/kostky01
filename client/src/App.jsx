import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import NicknameScreen from './components/NicknameScreen';

const socket = io();

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [screen, setScreen] = useState('nickname'); // 'nickname', 'lobby', 'room'
  const [nickname, setNickname] = useState('');
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

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nickname-set', onNicknameSet);
    socket.on('nickname-error', onNicknameError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nickname-set', onNicknameSet);
      socket.off('nickname-error', onNicknameError);
    };
  }, []);

  const handleJoin = (name) => {
    socket.emit('set-nickname', name);
  };

  return (
    <div className="app-container">
      <header className="neon-header">
        <h1>KOSTKY 10 000</h1>
        <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'ONLINE' : 'CONNECTING...'}
        </div>
      </header>
      
      {screen === 'nickname' && (
        <NicknameScreen onJoin={handleJoin} error={error} />
      )}

      {screen === 'lobby' && (
        <main className="hero-section">
          <div className="neon-card">
            <h2>Vítej, {nickname}</h2>
            <p>Vítejte v Lobby. Seznam her se načítá...</p>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;


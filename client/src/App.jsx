import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io();

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to server!');
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="app-container">
      <header className="neon-header">
        <h1>KOSTKY 10 000</h1>
        <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
          {isConnected ? 'ONLINE' : 'CONNECTING...'}
        </div>
      </header>
      
      <main className="hero-section">
        <div className="neon-card">
          <h2>Vítejte v Neonové Aréně</h2>
          <p>Připravte si kostky, hra brzy začne.</p>
          <button className="neon-button">VSTOUPIT DO LOBBY</button>
        </div>
      </main>
    </div>
  );
}

export default App;

import React from 'react';

function GameRoom({ room, onLeave }) {
  if (!room) return null;

  return (
    <main className="hero-section game-room-layout">
      <div className="room-header-neon">
        <div className="header-top">
          <h2 className="neon-text-cyan">{room.name}</h2>
          <span className="room-tag">ROOM ID: {room.id}</span>
        </div>
        <button className="neon-button sm pink-border" onClick={onLeave}>
          OPUSTIT HRU
        </button>
      </div>

      <div className="players-grid">
        <h3 className="section-title">Hráči ({room.players.length} / {room.maxPlayers})</h3>
        <div className="player-list-vertical">
          {room.players.map((p) => (
            <div key={p.id} className="player-badge neon-card glass">
              <div className="status-dot online"></div>
              <span className="player-name">{p.nickname}</span>
              {p.id === room.players[0].id && <span className="host-tag">HOST</span>}
            </div>
          ))}
          
          {[...Array(room.maxPlayers - room.players.length)].map((_, i) => (
            <div key={`empty-${i}`} className="player-badge empty glass">
              <span className="placeholder">Čekání na hráče...</span>
            </div>
          ))}
        </div>
      </div>

      <div className="room-footer">
        <p className="hint-text">Čekáme na zahájení hry hostitelem...</p>
      </div>
    </main>
  );
}

export default GameRoom;

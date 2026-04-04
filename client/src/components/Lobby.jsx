import React, { useState } from 'react';

function Lobby({ rooms, onlineStats, onCreateRoom, onJoinRoom, onReaction }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const emojis = ['🔥', '😂', '😭', '🎲', '👑'];

  const handleCreate = (e) => {
    e.preventDefault();
    onCreateRoom(newRoomName);
    setNewRoomName('');
    setIsCreating(false);
  };

  return (
    <main className="hero-section lobby-layout fade-in">
      {/* Global Status Bar */}
      <div className="online-players-card neon-card glass">
        <h3 className="section-title">ONLINE LEGENDY ({onlineStats.onlineCount})</h3>
        <div className="online-list-horizontal">
           {onlineStats.players.map((p, i) => (
             <span key={i} className="online-user-pill">{p}</span>
           ))}
        </div>
        
        <div className="reaction-buttons-row">
          {emojis.map(e => (
            <button key={e} className="reaction-btn" onClick={() => onReaction(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="lobby-header">
        <h2 className="neon-text-pink">Aktivní Místnosti</h2>
        <button 
          className="neon-button primary" 
          onClick={() => onCreateRoom()}
        >
          NOVÁ HRA
        </button>
      </div>

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="neon-card empty-state">
            <p>Žádné aktivní hry. Buď první!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-item neon-card glass">
              <div className="room-info">
                <h3>{room.name}</h3>
                <div className="room-player-names">
                   {room.playerNames?.join(', ') || 'Čeká se na hráče...'}
                </div>
                <span className="room-id">ID: {room.id}</span>
              </div>
              <div className="room-actions">
                <span className="player-count">
                  {room.playerCount} / {room.maxPlayers}
                </span>
                <button 
                  className="neon-button sm primary"
                  disabled={room.playerCount >= room.maxPlayers}
                  onClick={() => onJoinRoom(room.id)}
                >
                  JOIN
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default Lobby;

import React, { useState } from 'react';

function Lobby({ rooms, onCreateRoom, onJoinRoom }) {
  const [newRoomName, setNewRoomName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e) => {
    e.preventDefault();
    onCreateRoom(newRoomName);
    setNewRoomName('');
    setIsCreating(false);
  };

  return (
    <main className="hero-section lobby-layout">
      <div className="lobby-header">
        <h2 className="neon-text-pink">Aktivní Hry</h2>
        <button 
          className="neon-button compact" 
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? 'ZRUŠIT' : 'ZALOŽIT HRU'}
        </button>
      </div>

      {isCreating && (
        <div className="neon-card glass creation-pane">
          <form onSubmit={handleCreate} className="nickname-form">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Název místnosti..."
              maxLength={20}
              required
              className="neon-input"
            />
            <button type="submit" className="neon-button full-width">VYTVOŘIT</button>
          </form>
        </div>
      )}

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
                <span className="room-id">ID: {room.id}</span>
              </div>
              <div className="room-actions">
                <span className="player-count">
                  {room.playerCount} / {room.maxPlayers}
                </span>
                <button 
                  className="neon-button sm"
                  disabled={room.playerCount >= room.maxPlayers}
                  onClick={() => onJoinRoom(room.id)}
                >
                  PŘIPOJIT
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

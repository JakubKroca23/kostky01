import React from 'react';

function GameRoom({ room, nickname, onRoll, onStop, onStart, isConnected }) {
  if (!room) return null;

  const isMyTurn = room.turnInfo.currentTurnId === room.players.find(p => p.nickname === nickname)?.id;
  const canStart = !room.gameStarted && room.players[0].nickname === nickname;

  return (
    <main className="hero-section game-room-layout">
      <div className="room-header-neon">
        <div className="header-top">
          <h2 className="neon-text-cyan">{room.name}</h2>
          <span className="room-tag">ID: {room.id}</span>
        </div>
        {!room.gameStarted && canStart && (
          <button className="neon-button sm" onClick={onStart}>
            START HRY
          </button>
        )}
      </div>

      {!room.gameStarted ? (
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
          </div>
        </div>
      ) : (
        <div className="game-area">
          <div className="scoreboard glass">
            {room.players.map(p => (
              <div key={p.id} className={`score-row ${room.turnInfo.currentTurnId === p.id ? 'active-turn' : ''}`}>
                <span className="score-name">{p.nickname}</span>
                <span className="score-value">{room.turnInfo.scores[p.id] || 0}</span>
              </div>
            ))}
          </div>

          <div className="dice-display-area">
            <div className="dice-container">
              {room.turnInfo.lastRoll.length > 0 ? (
                room.turnInfo.lastRoll.map((val, i) => (
                  <div key={i} className="die neon-card glass">
                    {val}
                  </div>
                ))
              ) : (
                <div className="empty-dice">Připraven k hodu...</div>
              )}
            </div>
            
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">BODY V TAHU</span>
                <span className="stat-value neon-text-pink">{room.turnInfo.turnPoints || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">HODŮ</span>
                <span className="stat-value">{room.turnInfo.rollCount || 0} / 3</span>
              </div>
            </div>
          </div>

          <div className="game-controls">
            {isMyTurn ? (
              <>
                <button className="neon-button full-width" onClick={onRoll}>HODIT KOSTKOU</button>
                <button 
                  className="neon-button pink-border full-width" 
                  onClick={onStop}
                  disabled={room.turnInfo.turnPoints < 350}
                >
                  ZAPSAT BODY (350+)
                </button>
              </>
            ) : (
              <div className="wait-message">Čekáme na tah: {room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameRoom;


import React from 'react';

function Scoreboard({ players, room, currentTurnId }) {
  return (
    <div className="room-scoreboard glass neon-card">
      <h3>VÝSLEDKY</h3>
      <div className="player-list">
        {players.map(p => (
          <div key={p.id} className={`player-row ${p.id === currentTurnId ? 'active-player-glow' : ''}`}>
            <div className="p-info">
              <span className={`p-name ${p.id === currentTurnId ? 'active' : ''}`}>
                {p.nickname} {p.id === currentTurnId ? '🎲' : ''}
              </span>
              <span className="p-score">{room.turnInfo.scores[p.id] || 0} / 10000</span>
            </div>
            <div className="p-strikes">
              {Array.from({ length: room.turnInfo.strikes[p.id] || 0 }).map((_, i) => (
                <span key={i} className="strike-icon">❌</span>
              ))}
            </div>
            {p.id === currentTurnId && room.turnInfo.turnPoints > 0 && (
              <div className="current-turn-pts neon-text-pink">
                +{room.turnInfo.turnPoints}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Scoreboard;

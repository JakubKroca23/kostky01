import React from 'react';

function VictoryModal({ winner, scores, onBack }) {
  return (
    <div className="victory-overlay fade-in">
      <div className="victory-card neon-card glass">
        <h2 className="neon-text-pink title-large">VÍTĚZSTVÍ!</h2>
        <div className="winner-announcement">
          <span className="winner-name neon-text-cyan">{winner}</span>
          <p>Dosáhl limitu 10 000 bodů!</p>
        </div>
        
        <div className="final-scoreboard">
          {Object.entries(scores).map(([id, val]) => (
            <div key={id} className="final-row">
              <span>Hráč:</span>
              <span className="final-val">{val}b</span>
            </div>
          ))}
        </div>

        <button className="neon-button full-width" onClick={onBack}>
          ZPĚT DO LOBBY
        </button>
      </div>
    </div>
  );
}

export default VictoryModal;

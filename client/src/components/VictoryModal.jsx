import React, { useEffect, useRef } from 'react';

// Počet konfetových částic
const CONFETTI_COUNT = 60;

// Barvy konfet v neonovém stylu
const CONFETTI_COLORS = [
  'var(--neon-pink)',
  'var(--neon-cyan)',
  'var(--neon-green)',
  'var(--neon-gold)',
  '#ff6bcb',
  '#00e5ff',
];

function generateConfettiParticles() {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    // Různé délky animace pro přirozený efekt
    duration: `${1.5 + Math.random() * 2.5}s`,
    // Různé zpoždění pro vlnový efekt
    delay: `${Math.random() * 1.2}s`,
    size: `${6 + Math.random() * 8}px`,
    // Náhodný sklon pro rotaci
    rotation: `${Math.random() * 360}deg`,
    // Horizontální drift
    drift: `${(Math.random() - 0.5) * 120}px`,
  }));
}

function VictoryModal({ winner, scores, onBack }) {
  const particles = useRef(generateConfettiParticles()).current;

  // Seřadit hráče sestupně podle skóre
  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  return (
    <div className="victory-overlay">
      {/* Konfetové částice */}
      <div className="confetti-container" aria-hidden="true">
        {particles.map(p => (
          <span
            key={p.id}
            className="confetti-particle"
            style={{
              left: p.left,
              backgroundColor: p.color,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              '--drift': p.drift,
              '--rotation': p.rotation,
            }}
          />
        ))}
      </div>

      {/* Hlavní karta vítězství */}
      <div className="victory-card neon-card glass">
        {/* Neonová záře za kartou */}
        <div className="victory-glow" aria-hidden="true" />

        <div className="victory-trophy">🏆</div>

        <h2 className="victory-title">VÍTĚZSTVÍ!</h2>

        <div className="winner-announcement">
          <p className="victory-label">Vítěz hry</p>
          <span className="winner-name">{winner}</span>
        </div>

        {/* Finální tabulka skóre */}
        <div className="final-scoreboard">
          <p className="scoreboard-heading">Závěrečné skóre</p>
          {sortedScores.map(([name, val], idx) => (
            <div
              key={name}
              className={`final-row ${name === winner ? 'final-row--winner' : ''}`}
            >
              <div className="final-rank">#{idx + 1}</div>
              <div className="final-name">{name}</div>
              <div className="final-val">
                {val.toLocaleString('cs-CZ')}
                <span className="final-unit"> b</span>
              </div>
            </div>
          ))}
        </div>

        <button id="victory-back-btn" className="neon-button secondary full-width victory-btn" onClick={onBack}>
          ZPĚT DO LOBBY
        </button>
      </div>
    </div>
  );
}

export default VictoryModal;

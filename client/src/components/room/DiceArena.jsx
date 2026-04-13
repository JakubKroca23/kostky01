import React, { forwardRef } from 'react';

const DiceArena = forwardRef(({ bustMsg, showConfetti }, ref) => {
  return (
    <div className="dice-arena-container">
      <div 
        id="dice-canvas-container" 
        ref={ref} 
        style={{ width: '100%', height: '400px', position: 'relative' }}
      >
        {/* Matter.js canvas will be injected here */}
      </div>
      
      {bustMsg && (
        <div className="bust-overlay fade-in">
          <div className="bust-content animate-shake">
            <span className="bust-emoji">💥</span>
            <div className="bust-text neon-text-pink">{bustMsg}</div>
          </div>
        </div>
      )}
      
      {showConfetti && (
        <div className="victory-overlay fade-in">
          <div className="victory-content animate-bounce">
            <span className="victory-emoji">🏆</span>
            <div className="victory-text neon-text-gold">VÍTĚZSTVÍ!</div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DiceArena;

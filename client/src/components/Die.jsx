import React from 'react';

const DOTS_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8]
};

function Die({ value, isSelected, onClick, isRolling, style }) {
  const dots = DOTS_MAP[value] || [];

  return (
    <div 
      className={`dice-body neon-card glass ${isSelected ? 'selected' : ''} ${isRolling ? 'rolling' : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className="dots-grid">
        {[...Array(9)].map((_, i) => (
          <div key={i} className={`dot ${dots.includes(i) ? 'visible' : ''}`}></div>
        ))}
      </div>
    </div>
  );
}

export default Die;

import React from 'react';

const DOTS_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8]
};

function Die({ value, isSelected, onClick, isRolling, canSelect, style, showValue = true }) {
  const dots = showValue ? (DOTS_MAP[value] || []) : [];

  // style obsahuje --tx, --ty, --tr z Matter.js
  // Aplikujeme transform přímo kvůli 60fps real-time updatu
  const tx = style?.['--tx'] ?? '0px';
  const ty = style?.['--ty'] ?? '0px';
  const tr = style?.['--tr'] ?? '0rad';

  const divStyle = {
    transform: `translate(${tx}, ${ty}) rotate(${tr})`,
  };

  return (
    <div 
      className={`dice-body ${isSelected ? 'selected' : ''} ${isRolling ? 'rolling' : ''} ${canSelect ? 'can-select' : ''}`}
      onClick={onClick}
      style={divStyle}
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

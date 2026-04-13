import React from 'react';

function GameControls({ 
  isMyTurn, 
  canRoll, 
  canBank, 
  canEnterBoard, 
  turnPoints, 
  storedDiceCount, 
  onRoll, 
  onBank, 
  onStartGame, 
  onAddBot,
  gameStarted, 
  isHost, 
  playerCount 
}) {
  if (!gameStarted) {
    return (
      <div className="game-controls">
        {isHost ? (
          <div className="setup-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' }}>
            <div className="bot-setup glass neon-card" style={{ padding: '15px' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                🤖 Přidat AI protihráče
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <button className="neon-button sm" onClick={() => onAddBot('cautious')}>Opatrný</button>
                <button className="neon-button sm primary" onClick={() => onAddBot('balanced')}>Vyvážený</button>
                <button className="neon-button sm danger" onClick={() => onAddBot('gambler')}>Gambler</button>
              </div>
            </div>
            
            <button 
              className="neon-button success lg" 
              onClick={onStartGame}
              disabled={playerCount < 2}
              style={{ height: '60px', fontSize: '1.2rem' }}
            >
              START HRY {playerCount < 2 ? '(MIN. 2 HRÁČI)' : '🚀'}
            </button>
          </div>
        ) : (
          <div className="waiting-msg neon-text-cyan pulse-slow">ČEKÁME NA START HOSTITELEM...</div>
        )}
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="game-controls">
        <div className="waiting-msg opacity-50">SOUPEŘ HÁZÍ...</div>
      </div>
    );
  }

  return (
    <div className="game-controls animate-pulse-slow">
      <div className="controls-row">
        <button 
          className="neon-button lg" 
          onClick={onRoll} 
          disabled={!canRoll}
        >
          HODIT KOSTKOU
        </button>
        <button 
          className="neon-button lg success" 
          onClick={onBank} 
          disabled={!canBank}
        >
          BANKOVAT ({turnPoints})
        </button>
      </div>
      
      {!canEnterBoard && turnPoints > 0 && (
        <div className="control-hint neon-text-pink">
          Potřebuješ aspoň 350 pro vstup na desku! (Zbývá: {350 - turnPoints})
        </div>
      )}
      
      {storedDiceCount === 6 && canRoll && (
        <div className="control-hint neon-text-gold animate-bounce">
          PODAŘILO SE! Můžeš házet znovu se všemi 6 kostkami!
        </div>
      )}
    </div>
  );
}

export default GameControls;

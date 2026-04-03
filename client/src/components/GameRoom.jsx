import React, { useState, useEffect } from 'react';
import Die from './Die';
import { calculateScore } from '../utils/scoring';
import { audio } from '../utils/audio';

function GameRoom({ room, nickname, onRoll, onRollAgain, onStop, onStart }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  if (!room) return null;

  const myId = room.players.find(p => p.nickname === nickname)?.id;
  const isMyTurn = room.turnInfo.currentTurnId === myId;
  const canStart = !room.gameStarted && room.players[0].nickname === nickname;

  const allowed = room.turnInfo.allowedIndexes || [];

  // Reset selection when turn or roll changes
  useEffect(() => {
    setSelectedDice([]);
    setErrorLocal('');
    if (room.turnInfo.lastRoll.length > 0) {
       setIsRolling(true);
       const timer = setTimeout(() => setIsRolling(false), 1000);
       return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.lastRoll]);

  const toggleDie = (index) => {
    if (!isMyTurn || isRolling) return;
    if (!allowed.includes(index)) {
      setErrorLocal('Tato kostka netvoří body.');
      setTimeout(() => setErrorLocal(''), 2000);
      return;
    }

    audio.playClick();
    setSelectedDice(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const validateAndDo = (action, isStop) => {
    if (selectedDice.length === 0 && !isStop) {
      setErrorLocal('Musíš vybrat alespoň jednu kostku.');
      setTimeout(() => setErrorLocal(''), 2000);
      return;
    }

    if (selectedDice.length > 0) {
      const vals = selectedDice.map(i => room.turnInfo.lastRoll[i]);
      const { score, usedIndexes } = calculateScore(vals);
      
      if (score === 0 || usedIndexes.length !== selectedDice.length) {
        setErrorLocal('Vybrané kostky netvoří celou bodovou kombinaci!');
        setTimeout(() => setErrorLocal(''), 3000);
        return;
      }
    }
    
    action(selectedDice);
  };

  const currentTurnPoints = room.turnInfo.turnPoints || 0;

  return (
    <main className="hero-section game-room-layout">
      {errorLocal && <div className="global-error-toast glass neon-card">{errorLocal}</div>}
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
          <h3 className="section-title">Čekání na hru...</h3>
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
        <div className="game-area fade-in">
          <div className="scoreboard glass">
            {room.players.map(p => (
              <div key={p.id} className={`score-row ${room.turnInfo.currentTurnId === p.id ? 'active-turn' : ''}`}>
                <span className="score-name">{p.nickname}</span>
                <span className="score-value">{room.turnInfo.scores[p.id] || 0}</span>
              </div>
            ))}
          </div>

          <div className="dice-arena glass">
            <div className="dice-container">
              {room.turnInfo.lastRoll.length > 0 ? (
                room.turnInfo.lastRoll.map((val, i) => (
                  <Die 
                    key={i} 
                    value={val} 
                    isSelected={selectedDice.includes(i)}
                    isRolling={isRolling}
                    onClick={() => toggleDie(i)}
                  />
                ))
              ) : (
                <div className="empty-dice">Aréna připravena...</div>
              )}
            </div>
          </div>

          <div className="turn-summary neon-card glass">
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">BODY V TAHU</span>
                <span className="stat-value neon-text-pink">{currentTurnPoints}</span>
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
                {room.turnInfo.rollCount === 0 || isRolling ? (
                   <button className="neon-button full-width" onClick={onRoll} disabled={isRolling}>HODIT KOSTKOU</button>
                ) : (
                  <>
                    <button 
                      className="neon-button full-width" 
                      onClick={() => validateAndDo(onRollAgain, false)}
                      disabled={isRolling}
                    >
                      HODIT ZBYTKEM ({room.turnInfo.diceCount - selectedDice.length})
                    </button>
                    <button 
                      className="neon-button pink-border full-width" 
                      onClick={() => validateAndDo(onStop, true)}
                      disabled={isRolling || (selectedDice.length === 0 && currentTurnPoints < 350)}
                    >
                      ZAPSAT BODY
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="wait-message neon-card glass">
                Čekáme na tah: <span className="neon-text-cyan">{room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameRoom;

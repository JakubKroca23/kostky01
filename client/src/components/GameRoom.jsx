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
       const timer = setTimeout(() => setIsRolling(false), 600);
       return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.lastRoll]);

  const handleDieClick = (index) => {
    if (isRolling || !isMyTurn) return;
    
    const isAllowed = room.turnInfo.allowedIndexes.includes(index);
    if (!isAllowed) return;

    if (selectedDice.includes(index)) {
      // If already selected, remove it
      setSelectedDice(prev => prev.filter(i => i !== index));
      audio.playClick();
      return;
    }

    // GROUP SELECTION LOGIC:
    // If this die is part of a multiple (3+ of same value) in allowedIndexes, select all of them
    const dieValue = room.turnInfo.lastRoll[index];
    const allowedDiceInCombo = room.turnInfo.allowedIndexes.filter(i => room.turnInfo.lastRoll[i] === dieValue);
    
    if (allowedDiceInCombo.length >= 3) {
      // Select the whole group
      setSelectedDice(prev => [...new Set([...prev, ...allowedDiceInCombo])]);
    } else {
      // Singular selection (1s or 5s)
      setSelectedDice(prev => [...prev, index]);
    }
    
    audio.playClick();
  };

  const renderDice = () => {
    return room.turnInfo.lastRoll.map((value, index) => {
      const isSelected = selectedDice.includes(index);
      const canSelect = isMyTurn && room.turnInfo.allowedIndexes.includes(index);

      // Physics variables for independent motion
      const physicsStyle = {
        '--dx1': `${Math.random() * 100 - 50}px`,
        '--dy1': `${Math.random() * 160 - 80}px`,
        '--dr1': `${Math.random() * 720}deg`,
        '--dx2': `${Math.random() * 100 - 50}px`,
        '--dy2': `${Math.random() * 160 - 80}px`,
        '--dr2': `${Math.random() * 720}deg`,
        '--dx3': `${Math.random() * 100 - 50}px`,
        '--dy3': `${Math.random() * 160 - 80}px`,
        '--dr3': `${Math.random() * 720}deg`,
        '--dx4': `${Math.random() * 100 - 50}px`,
        '--dy4': `${Math.random() * 160 - 80}px`,
        '--dr4': `${Math.random() * 720}deg`,
      };

      return (
        <Die
          key={index}
          value={value}
          isSelected={isSelected}
          isRolling={isRolling}
          canSelect={canSelect}
          style={physicsStyle}
          onClick={() => handleDieClick(index)}
        />
      );
    });
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

          <div className="dice-arena">
            <div className="dice-container">
              {room.turnInfo.lastRoll.length > 0 ? (
                renderDice()
              ) : (
                <div className="empty-dice neon-text-cyan">Aréna připravena...</div>
              )}
            </div>
          </div>

          <div className="turn-summary neon-card">
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">BODY V TAHU</span>
                <div className="stat-value neon-text-pink">{currentTurnPoints}</div>
              </div>
              <div className="stat-item">
                <span className="stat-label">POČET HODŮ</span>
                <div className="stat-value">{room.turnInfo.rollCount || 0}</div>
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

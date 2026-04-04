import React, { useState, useEffect } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '../utils/scoring.js';

function GameRoom({ room, nickname, onRoll, onRollAgain, onStop, onStart, isConnected, completionOffer, onAcceptCompletion, onDeclineCompletion }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const physicsPositions = useDicePhysics(
    room?.turnInfo?.lastRoll?.length || 0,
    isRolling,
    460,
    340
  );

  if (!room) return null;

  const myId = room.players.find(p => p.nickname === nickname)?.id;
  const isMyTurn = room.turnInfo.currentTurnId === myId;
  const canStart = !room.gameStarted && room.players[0].nickname === nickname;
  const currentTurnPoints = room.turnInfo.turnPoints || 0;

  // Spustí animaci hodu – délka musí být KRATŠÍ než server timeout (1500ms)
  // aby se controls odemkly dřív než přijde nový turn od serveru
  useEffect(() => {
    setSelectedDice([]);
    setErrorLocal('');
    if (room.turnInfo.lastRoll.length > 0) {
      setIsRolling(true);
      const timer = setTimeout(() => setIsRolling(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.lastRoll]);

  const handleDieClick = (index) => {
    if (isRolling || !isMyTurn) return;

    const isAllowed = (room.turnInfo.allowedIndexes || []).includes(index);
    if (!isAllowed) return;

    const dieValue = room.turnInfo.lastRoll[index];
    const occurrencesInRoll = room.turnInfo.lastRoll.filter(v => v === dieValue).length;
    
    // Smart selection logic:
    // If it's a 3+ combination, select/deselect whole group.
    // If it's 1 or 2 ones/fives, select/deselect individually.
    const isCombo = occurrencesInRoll >= 3;

    if (isCombo) {
      // Find all indexes of this value that are in allowedIndexes
      const comboIndexes = (room.turnInfo.allowedIndexes || []).filter(
        i => room.turnInfo.lastRoll[i] === dieValue
      );
      const allSelected = comboIndexes.every(i => selectedDice.includes(i));
      
      if (allSelected) {
        setSelectedDice(prev => prev.filter(i => !comboIndexes.includes(i)));
      } else {
        setSelectedDice(prev => [...new Set([...prev, ...comboIndexes])]);
      }
    } else {
      // Individual toggle
      if (selectedDice.includes(index)) {
        setSelectedDice(prev => prev.filter(i => i !== index));
      } else {
        setSelectedDice(prev => [...prev, index]);
      }
    }

    audio.playClick();
  };

  const renderDice = () => {
    return room.turnInfo.lastRoll.map((value, index) => {
      const isSelected = selectedDice.includes(index);
      const canSelect = isMyTurn && (room.turnInfo.allowedIndexes || []).includes(index);
      const pos = physicsPositions[index] || { x: 0, y: 0, angle: 0 };

      const style = {
        '--tx': `${pos.x}px`,
        '--ty': `${pos.y}px`,
        '--tr': `${pos.angle}rad`,
      };

      return (
        <Die
          key={index}
          value={value}
          isSelected={isSelected}
          isRolling={isRolling}
          canSelect={canSelect}
          style={style}
          onClick={() => handleDieClick(index)}
        />
      );
    });
  };

  const handleRollAgain = () => {
    if (selectedDice.length === 0) {
      setErrorLocal('Musíš vybrat alespoň jednu kostku.');
      setTimeout(() => setErrorLocal(''), 2000);
      return;
    }
    onRollAgain(selectedDice);
  };

  const handleStop = () => {
    onStop(selectedDice);
  };

  return (
    <main className="hero-section game-room-layout">
      {errorLocal && <div className="global-error-toast glass neon-card">{errorLocal}</div>}

      {completionOffer && room.turnInfo.currentTurnId === myId && (
        <div className="completion-offer-overlay fade-in">
          <div className="completion-modal neon-card glass">
            <h3 className="neon-text-pink">DOHODIT?</h3>
            <p>Máš 5/6 kostek k <strong>{completionOffer.type === 'postupka' ? 'POSTUPCE' : 'TŘEM PÁRŮM'}</strong>!</p>
            <p>Chceš dohodit chybějící <strong>{completionOffer.missingValue}</strong>?</p>
            <div className="completion-warning">⚠️ Neúspěch = 0 bodů za tah + čárka!</div>
            <div className="completion-actions">
              <button className="neon-button primary" onClick={onAcceptCompletion}>DOHODIT</button>
              <button className="neon-button pink-border" onClick={onDeclineCompletion}>ODMÍTNOUT</button>
            </div>
          </div>
        </div>
      )}

      <div className="room-header-neon">
        <div className="header-top">
          <h2 className="neon-text-cyan">{room.name}</h2>
          <span className="room-tag">ID: {room.id}</span>
        </div>
        {!room.gameStarted && canStart && (
          <button className="neon-button sm" onClick={onStart}>START HRY</button>
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
            {room.players.map(p => {
              const totalScore = (room.turnInfo.scores && room.turnInfo.scores[p.id]) || 0;
              const strikes = (room.turnInfo.strikes && room.turnInfo.strikes[p.id]) || 0;
              const isActive = room.turnInfo.currentTurnId === p.id;
              const pending = isActive ? currentTurnPoints : 0;
              return (
                <div key={p.id} className={`score-row ${isActive ? 'active-turn' : ''}`}>
                  <div className="score-left">
                    <span className="score-name">
                      {isActive ? '🎲 ' : ''}{p.nickname}
                    </span>
                    <div className="score-strikes">
                      {[...Array(strikes)].map((_, i) => (
                        <span key={i} className="strike-mark">▪</span>
                      ))}
                    </div>
                  </div>
                  <div className="score-right">
                    {pending > 0 && (
                      <span className="score-pending">+{pending}</span>
                    )}
                    <span className="score-value">{totalScore}</span>
                    <span className="score-max">/ 10 000</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dice-arena">
            <div className="dice-container">
              {room.turnInfo.lastRoll.length > 0
                ? renderDice()
                : <div className="empty-dice neon-text-cyan">Aréna připravena...</div>
              }
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
                {/* První hod v tahu NEBO animace stále běží */}
                {room.turnInfo.rollCount === 0 ? (
                  <button
                    className="neon-button full-width"
                    onClick={onRoll}
                    disabled={isRolling}
                  >
                    HODIT KOSTKOU
                  </button>
                ) : (
                  /* Po hodu: zobraz tlačítka pro výběr i během animace */
                  <>
                    <button
                      className="neon-button full-width"
                      onClick={handleRollAgain}
                      disabled={isRolling}
                    >
                      {isRolling
                        ? '⏳ Hod...'
                        : room.turnInfo.diceCount === 6 
                          ? 'HODIT DO PLNÝCH (Hot Dice! 🎲)'
                          : `HODIT ZBYTKEM (${room.turnInfo.diceCount - selectedDice.length})`
                      }
                    </button>
                    <button
                      className="neon-button pink-border full-width"
                      onClick={handleStop}
                      disabled={isRolling || (room.turnInfo.turnPoints + (calculateScore(selectedDice.map(i => room.turnInfo.lastRoll[i]), false).score)) < 350}
                    >
                      ZAPSAT BODY ({currentTurnPoints + (calculateScore(selectedDice.map(i => room.turnInfo.lastRoll[i]), false).score)})
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="wait-message neon-card glass">
                Čekáme na tah:{' '}
                <span className="neon-text-cyan">
                  {room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameRoom;

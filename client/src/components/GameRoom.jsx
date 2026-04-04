import React, { useState, useEffect } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '../utils/scoring';

function GameRoom({ room, nickname, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  const physicsPositions = useDicePhysics(
    room?.turnInfo?.lastRoll?.length || 0,
    isRolling,
    420,
    340
  );

  if (!room) return null;

  const myId = room.players.find(p => p.nickname === nickname)?.id;
  const isMyTurn = room.turnInfo.currentTurnId === myId;
  const canStart = !room.gameStarted && room.players[0].nickname === nickname;
  const currentTurnPoints = room.turnInfo.turnPoints || 0;
  
  const selectedPoints = selectedDice.length > 0 
    ? calculateScore(selectedDice.map(i => room.turnInfo.lastRoll[i]), room.turnInfo.rollCount === 1).score 
    : 0;

  const emojis = ['🔥', '😂', '😭', '🎲', '👑'];

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

    const allowed = room.turnInfo.allowedIndexes || [];
    if (!allowed.includes(index)) return;

    if (selectedDice.includes(index)) {
      setSelectedDice(prev => prev.filter(i => i !== index));
      audio.playClick();
      return;
    }

    const roll = room.turnInfo.lastRoll || [];
    const dieValue = roll[index];
    
    // Check if it's a special 6-dice combo (Straight or Pairs)
    // If all 6 dice are allowed and it's the first roll, it's likely a combo.
    if (room.turnInfo.rollCount === 1 && allowed.length === 6) {
      setSelectedDice(allowed);
    } else {
      // Standard group select for multiples (3+)
      const sameValueIndices = allowed.filter(i => roll[i] === dieValue);
      if (sameValueIndices.length >= 3) {
        setSelectedDice(prev => [...new Set([...prev, ...sameValueIndices])]);
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
              const hasEntered = (room.turnInfo.enteredBoard && room.turnInfo.enteredBoard[p.id]);
              const isActive = room.turnInfo.currentTurnId === p.id;
              const pending = isActive ? currentTurnPoints : 0;
              
              return (
                <div key={p.id} className={`score-row ${isActive ? 'active-turn' : ''} ${!hasEntered ? 'waiting-entry' : ''}`}>
                  <div className="score-main">
                    <span className="score-name">
                      {isActive ? '🎲 ' : ''}{p.nickname}
                    </span>
                    {strikes > 0 && (
                      <span className="strikes-display">
                        {"|".repeat(strikes)}
                      </span>
                    )}
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

          <div className="dice-arena-wrapper">
            <div className="dice-arena">
              <div className="dice-container">
                {room.turnInfo.lastRoll.length > 0
                  ? renderDice()
                  : <div className="empty-dice neon-text-cyan">Aréna připravena...</div>
                }
              </div>
            </div>

            <aside className="aside-storage glass">
               <span className="storage-label">ODLOŽENO</span>
               {(room.turnInfo.storedDice || []).map((val, i) => (
                 <div key={i} className="die-stored">{val}</div>
               ))}
            </aside>
          </div>

          <div className="reaction-buttons-row">
            {emojis.map(e => (
              <button key={e} className="reaction-btn" onClick={() => onReaction(e)}>
                {e}
              </button>
            ))}
          </div>

          <div className="turn-summary neon-card">
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">BANKOVÁNO</span>
                <div className="stat-value neon-text-cyan">{currentTurnPoints}</div>
              </div>
              <div className="stat-item">
                <span className="stat-label">VÝBĚR</span>
                <div className="stat-value neon-text-pink">+{selectedPoints}</div>
              </div>
              <div className="stat-item">
                <span className="stat-label">HOD</span>
                <div className="stat-value">{room.turnInfo.rollCount || 0}</div>
              </div>
            </div>
          </div>

          <div className="game-controls">
            {isMyTurn ? (
              <>
                {/* Rule 13: Dohazování */}
                {room.turnInfo.canDohodit && (
                   <button 
                    className="neon-button full-width gold-border" 
                    onClick={onDohodit}
                    disabled={isRolling}
                   >
                     🔥 DOHODIT (VŠE NEBO NIC)
                   </button>
                )}

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
                        : `HODIT ZBYTKEM (${room.turnInfo.diceCount - selectedDice.length})`
                      }
                    </button>
                    <button
                      className="neon-button pink-border full-width"
                      onClick={handleStop}
                      disabled={isRolling || (currentTurnPoints + selectedPoints < 350 && !room.turnInfo.enteredBoard[myId])}
                    >
                      ZAPSAT BODY ({currentTurnPoints + selectedPoints})
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

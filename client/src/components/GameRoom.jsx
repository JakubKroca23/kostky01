import React, { useState, useEffect } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '../utils/scoring';

function GameRoom({ room, nickname, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
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

    const roll = room.turnInfo.lastRoll || [];
    const dieValue = roll[index];
    
    // Check if it's a special 6-dice combo (Straight or Pairs)
    if (room.turnInfo.rollCount === 1 && allowed.length === 6) {
      setSelectedDice(allowed);
    } else {
      const sameValueIndices = allowed.filter(i => roll[i] === dieValue);
      if (sameValueIndices.length >= 3) {
        setSelectedDice(prev => [...new Set([...prev, ...sameValueIndices])]);
      } else {
        setSelectedDice(prev => [...prev, index]);
      }
    }
    audio.playClick();
  };

  const handleUnselect = (indexInSelected) => {
    if (isRolling || !isMyTurn) return;
    const indexInRoll = selectedDice[indexInSelected];
    setSelectedDice(prev => prev.filter(i => i !== indexInRoll));
    audio.playClick();
  };

  const renderDice = () => {
    return room.turnInfo.lastRoll.map((value, index) => {
      if (selectedDice.includes(index)) return null;

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
          isSelected={false}
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

      <div className="room-header-neon compact">
        <div className="header-top">
          <h2 className="neon-text-cyan">{room.name}</h2>
          <span className="room-tag">ID: {room.id}</span>
        </div>
        {!room.gameStarted && canStart && (
          <button className="neon-button sm" onClick={onStart}>START HRY</button>
        )}
        
        <div className="reactions-container">
          <button 
            className={`reaction-trigger ${isReactionsOpen ? 'active' : ''}`}
            onClick={() => setIsReactionsOpen(!isReactionsOpen)}
          >
            🎭
          </button>
          {isReactionsOpen && (
            <div className="reactions-flyout glass fade-in">
              {emojis.map(e => (
                <button key={e} className="reaction-btn-mini" onClick={() => { onReaction(e); setIsReactionsOpen(false); }}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
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
                 <div key={`stored-${i}`} className="die-stored locked">{val}</div>
               ))}
               {selectedDice.map((idx, i) => (
                 <div 
                  key={`selected-${i}`} 
                  className="die-stored active pulse"
                  onClick={() => handleUnselect(i)}
                  title="Vrátit do hry"
                 >
                   {room.turnInfo.lastRoll[idx]}
                 </div>
               ))}
            </aside>
          </div>

          <div className="turn-summary neon-card">
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">HOD</span>
                <div className="stat-value">{room.turnInfo.rollCount || 0}/3</div>
              </div>
              <div className="stat-item">
                <span className="stat-label">BANKOVÁNO</span>
                <div className="stat-value neon-text-cyan">{currentTurnPoints}</div>
              </div>
              <div className="stat-item">
                <span className="stat-label">VÝBĚR</span>
                <div className="stat-value neon-text-pink">+{selectedPoints}</div>
              </div>
            </div>
          </div>

          <div className="game-controls">
            {isMyTurn ? (
              <>
                {room.turnInfo.canDohodit && (
                   <button className="neon-button full-width gold-border" onClick={onDohodit} disabled={isRolling}>
                     🔥 DOHODIT (VŠE NEBO NIC)
                   </button>
                )}

                {room.turnInfo.rollCount === 0 ? (
                  <button className="neon-button full-width primary" onClick={onRoll} disabled={isRolling}>
                    HODIT KOSTKOU
                  </button>
                ) : (
                  <>
                    <button className="neon-button full-width" onClick={handleRollAgain} disabled={isRolling}>
                      {isRolling ? '⏳ Hod...' : 
                        (room.turnInfo.diceCount - selectedDice.length === 0 
                          ? '🔥 HODIT VŠECH 6 KOSTEK' 
                          : `HODIT ZBYTKEM (${room.turnInfo.diceCount - selectedDice.length})`)
                      }
                    </button>
                    <button
                      className="neon-button pink-border full-width"
                      onClick={handleStop}
                      disabled={isRolling || (currentTurnPoints + selectedPoints < 350)}
                    >
                      ZAPSAT BODY ({currentTurnPoints + selectedPoints})
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="wait-message neon-card glass">
                Na tahu: <span className="neon-text-cyan">{room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameRoom;

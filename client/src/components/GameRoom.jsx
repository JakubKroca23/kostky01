import React, { useState, useEffect, useRef } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '@shared/scoring.js';

function GameRoom({ socket, room, nickname, remoteSelection, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction, onUpdateSelection }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [arenaWidth, setArenaWidth] = useState(460);
  const arenaRef = useRef(null);

  useEffect(() => {
    if (!arenaRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setArenaWidth(entry.contentRect.width);
      }
    });
    observer.observe(arenaRef.current);
    return () => observer.disconnect();
  }, []);

  // CRITICAL: Guard before any room-dependent logic
  if (!room || !room.turnInfo) return null;

  const rollSeed = `${room.turnInfo.rollCount}-${room.turnInfo.lastRoll?.join('') || ''}`;
  const logicalWidth = 460;
  const logicalHeight = 340;
  const asideWidth = arenaWidth < 600 ? 64 : 80;
  const gapWidth = arenaWidth < 600 ? 8 : 20;
  const totalRequiredWidth = logicalWidth + asideWidth + gapWidth;
  const scale = arenaWidth < totalRequiredWidth ? (arenaWidth / totalRequiredWidth) : 1;

  const physicsPositions = useDicePhysics(
    room?.turnInfo?.lastRoll?.length || 0,
    isRolling,
    rollSeed,
    logicalWidth,
    logicalHeight
  );

  const myId = room.players.find(p => p.nickname === nickname)?.id;
  const isMyTurn = room.turnInfo.currentTurnId === myId;
  const canStart = !room.gameStarted && room.players[0].nickname === nickname;
  const currentTurnPoints = room.turnInfo.turnPoints || 0;
  
  // SYNC REMOTE SELECTION
  useEffect(() => {
    if (!isMyTurn && remoteSelection) {
      setSelectedDice(remoteSelection);
    }
  }, [remoteSelection, isMyTurn]);

  // Robust guard for index out of bounds
  const validSelected = selectedDice.filter(i => i < (room.turnInfo.lastRoll?.length || 0));
  
  const selectedPoints = validSelected.length > 0 
    ? calculateScore(validSelected.map(i => room.turnInfo.lastRoll[i]), room.turnInfo.rollCount === 1).score 
    : 0;

  const emojis = ['🔥', '😂', '😭', '🎲', '👑'];

  useEffect(() => {
    if (isMyTurn) setSelectedDice([]);
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
    
    let newSelection = [];
    // Check if it's a special 6-dice combo (Straight or Pairs)
    if (room.turnInfo.rollCount === 1 && allowed.length === 6) {
      newSelection = allowed;
    } else {
      const sameValueIndices = allowed.filter(i => roll[i] === dieValue);
      if (sameValueIndices.length >= 3) {
        newSelection = [...new Set([...selectedDice, ...sameValueIndices])];
      } else {
        newSelection = [...selectedDice, index];
      }
    }
    setSelectedDice(newSelection);
    onUpdateSelection?.(newSelection);
    audio.playClick();
  };

  const handleUnselect = (indexInSelected) => {
    if (isRolling || !isMyTurn) return;
    const indexInRoll = selectedDice[indexInSelected];
    const newSelection = selectedDice.filter(i => i !== indexInRoll);
    setSelectedDice(newSelection);
    onUpdateSelection?.(newSelection);
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
          <h2 className="neon-text-cyan">{room.name} <span className="room-tag-sm">({room.id})</span></h2>
        </div>
        {!room.gameStarted && canStart && (
          <button className="neon-button sm" onClick={onStart}>START</button>
        )}
        
        <div className="reactions-container">
          <button 
            className={`reaction-trigger-sm ${isReactionsOpen ? 'active' : ''}`}
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
                      {isActive ? '🎲 ' : ''}{p.nickname.substring(0, 8)}
                    </span>
                  </div>
                  <div className="score-right">
                    {pending > 0 && <span className="score-pending">+{pending}</span>}
                    <span className="score-value">{totalScore}</span>
                  </div>
                </div>
              );
            })}
          </div>


          <div className="game-main-horizontal-layout">
            <div className="dice-arena-wrapper" ref={arenaRef}>
              <div className="game-main-area">
                <div 
                  className="dice-arena" 
                  style={{ 
                    width: `${logicalWidth}px`, 
                    height: `${logicalHeight}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                  }}
                >
                  <div className="dice-container">
                    {room.turnInfo.lastRoll.length > 0
                      ? renderDice()
                      : <div className="empty-dice neon-text-cyan">Aréna připravena...</div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <aside className="aside-storage glass">
               <span className="storage-label">ODLOŽENO</span>
               <div className="storage-grid">
                 {(room.turnInfo.storedDice || []).map((val, i) => (
                   <div key={`stored-${i}`} className="die-stored locked">{val}</div>
                 ))}
                  {selectedDice.filter(idx => room.turnInfo.lastRoll[idx] !== undefined).map((idx, i) => (
                    <div 
                      key={`selected-${i}`} 
                      className="die-stored"
                      style={{ borderColor: isMyTurn ? 'var(--neon-pink)' : 'white' }}
                      onClick={() => handleUnselect(i)}
                    >
                      {room.turnInfo.lastRoll[idx]}
                    </div>
                  ))}
               </div>
            </aside>
          </div>

          <div className="turn-summary-compact neon-card">
            <div className="turn-stats">
              <div className="stat-item">
                <span className="stat-label">HOD {room.turnInfo.rollCount || 0}/3</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">BANK <span className="neon-text-cyan">{currentTurnPoints}</span></span>
              </div>
              <div className="stat-item">
                <span className="stat-label">VÝBĚR <span className="neon-text-pink">+{selectedPoints}</span></span>
              </div>
            </div>
          </div>

          <div className="game-controls">
            {isMyTurn ? (
              <>
                {room.turnInfo.canDohodit && (
                   <button className="neon-button full-width gold-border" onClick={onDohodit} disabled={isRolling}>
                     🔥 DOHODIT NA {room.turnInfo.canDohodit === true ? 'KOMBINACI' : room.turnInfo.canDohodit}
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
                      disabled={isRolling || (currentTurnPoints + selectedPoints < 350) || (room.turnInfo.diceCount - selectedDice.length === 0)}
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

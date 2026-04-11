import React, { useState, useEffect, useRef } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '@shared/scoring.js';

function GameRoom({ socket, room, nickname, remoteSelection, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction, onUpdateSelection, onSendMessage, onlineStats, onLeave, doubleStatus, onUpdateConfig }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [arenaWidth, setArenaWidth] = useState(460);
  const [chatInput, setChatInput] = useState('');
  const [valuesVisible, setValuesVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [doubleEnabled, setDoubleEnabled] = useState(room?.config?.doubleScoreEnabled || false);
  const [doubleInterval, setDoubleInterval] = useState(room?.config?.doubleInterval || 10);
  const [doubleDuration, setDoubleDuration] = useState(room?.config?.doubleDuration || 30);
  const chatRef = useRef(null);
  const arenaRef = useRef(null);

  useEffect(() => {
    if (!arenaRef.current) return;
    let timeoutId;
    const observer = new ResizeObserver(entries => {
      // Debounce resize updates for mobile stability
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (let entry of entries) {
          setArenaWidth(entry.contentRect.width);
        }
      }, 50);
    });
    observer.observe(arenaRef.current);
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [room.turnInfo.chat]);
  
  // Timer for Double Score
  useEffect(() => {
    if (!doubleStatus?.active || !doubleStatus?.endsAt) {
      setTimeLeft(0);
      return;
    }
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((doubleStatus.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [doubleStatus]);

  // CRITICAL: Guard before any room-dependent logic
  if (!room || !room.turnInfo) return null;

  // Sync state if room config changes from server
  useEffect(() => {
    if (room.config) {
      setDoubleEnabled(room.config.doubleScoreEnabled || false);
      setDoubleInterval(room.config.doubleInterval || 5);
      setDoubleDuration(room.config.doubleDuration || 30);
    }
  }, [room.config]);

  const rollSeed = `${room.turnInfo.rollCount}-${room.turnInfo.lastRoll?.join('') || ''}`;
  const logicalWidth = 460;
  const logicalHeight = 340;
  const asideWidth = arenaWidth < 600 ? 60 : 100; // Increased for better safe-spacing
  const gapWidth = arenaWidth < 600 ? 5 : 20;
  const horizontalPadding = 32; // Container padding + margins
  const safetyMargin = 10;
  
  const totalRequiredWidth = logicalWidth + asideWidth + gapWidth + horizontalPadding + safetyMargin;
  // Improved scale calculation with a floor to prevent tiny UI
  const calculatedScale = arenaWidth < totalRequiredWidth ? (arenaWidth / totalRequiredWidth) : 1;
  const scale = Math.max(calculatedScale, 0.45); 

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

  const lastRollCount = useRef(room.turnInfo.rollCount);
  const lastRollId = useRef(rollSeed);

  useEffect(() => {
    // CRITICAL: Reset selection for EVERYONE when a new roll happens or turn changes
    setSelectedDice([]);
    setErrorLocal('');

    // Only roll if it's a NEW roll (different seed or count)
    const isNewRoll = lastRollId.current !== rollSeed || lastRollCount.current !== room.turnInfo.rollCount;
    
    if (room.turnInfo.lastRoll.length > 0 && isNewRoll) {
      setIsRolling(true);
      setValuesVisible(false);
      const timer = setTimeout(() => {
        setIsRolling(false);
        setValuesVisible(true);
      }, 1200);
      lastRollId.current = rollSeed;
      lastRollCount.current = room.turnInfo.rollCount;
      return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.rollCount, rollSeed]);

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
          showValue={valuesVisible}
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
          <button className="neon-button sm logout-btn" onClick={onLeave} title="Odejít z místnosti">Odejít</button>
        </div>
        
        <div className="reactions-row-horizontal">
          {emojis.map(e => (
            <button key={e} className="reaction-btn-mini" onClick={() => onReaction(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {!room.gameStarted ? (
        <div className="players-grid">
          <h3 className="section-title">ONLINE HRÁČI ({onlineStats?.onlineCount || 1})</h3>
          <div className="lobby-players">
          {room.players.map((p, i) => (
            <div key={p.id} className="player-joined-row fade-in">
              <span className="player-num">{i + 1}.</span>
              <span className="player-name">
                {p.nickname} {i === 0 && <span className="host-tag">(HOST)</span>}
              </span>
            </div>
          ))}
          </div>

        {!room.gameStarted && canStart && (
          <div className="host-settings glass neon-card" style={{ marginBottom: '15px', padding: '15px' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '10px' }}>NASTAVENÍ HRY</h3>
            <div className="admin-action-row" style={{ marginBottom: '10px' }}>
              <div className="action-info">
                <h4 style={{ margin: 0, color: 'var(--neon-pink)' }}>Double Score Event</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Násobí body 2x v pravidelných intervalech.</p>
              </div>
              <div className={`admin-toggle ${doubleEnabled ? 'active' : ''}`} 
                   onClick={() => {
                     setDoubleEnabled(!doubleEnabled);
                     onUpdateConfig?.({ doubleScoreEnabled: !doubleEnabled, doubleInterval, doubleDuration });
                   }}>
                 <div className="toggle-handle"></div>
              </div>
            </div>

            {doubleEnabled && (
              <div className="double-settings fade-in" style={{ padding: '15px', marginTop: 0, marginBottom: '15px', background: 'rgba(157, 0, 255, 0.05)', border: '1px dashed var(--neon-purple)', borderRadius: '12px' }}>
                <div className="input-row" style={{ display: 'flex', gap: '15px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '5px' }}>INTERVAL (KOLA)</label>
                    <select 
                      value={doubleInterval} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        setDoubleInterval(val);
                        onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval: val, doubleDuration });
                      }}
                      className="chat-input glass"
                      style={{ width: '100%', padding: '10px', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="10" style={{background: '#0e0e1a'}}>Každých 10 hodů</option>
                      <option value="20" style={{background: '#0e0e1a'}}>Každých 20 hodů</option>
                      <option value="30" style={{background: '#0e0e1a'}}>Každých 30 hodů</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '5px' }}>TRVÁNÍ (SEKUNDY)</label>
                    <select 
                      value={doubleDuration} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 30;
                        setDoubleDuration(val);
                        onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval, doubleDuration: val });
                      }}
                      className="chat-input glass"
                      style={{ width: '100%', padding: '10px', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="30" style={{background: '#0e0e1a'}}>30 sekund</option>
                      <option value="60" style={{background: '#0e0e1a'}}>60 sekund</option>
                      <option value="90" style={{background: '#0e0e1a'}}>90 sekund</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <button className="neon-button start-hero full-width" onClick={onStart}>🔥 START HRY 🔥</button>
          </div>
        )}

        <div className="room-chat glass neon-card">
          <div className="chat-messages" ref={chatRef}>
            {(room.turnInfo.chat || []).map((m) => (
              <div key={m.id} className="chat-msg">
                <span className="msg-time">{m.time}</span>
                <span className="msg-sender">{m.sender}:</span>
                <span className="msg-text">{m.text}</span>
              </div>
            ))}
            {(room.turnInfo.chat || []).length === 0 && <div className="chat-empty">Žádné zprávy...</div>}
          </div>
          <form className="chat-form" onSubmit={(e) => {
            e.preventDefault();
            if (chatInput.trim()) {
              onSendMessage(chatInput);
              setChatInput('');
            }
          }}>
             <input 
               type="text" 
               className="chat-input glass" 
               value={chatInput} 
               onChange={(e) => setChatInput(e.target.value)}
               placeholder="Napiš zprávu..."
               maxLength={100}
             />
             <button type="submit" className="neon-button sm chat-send">Odeslat</button>
          </form>
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
                      {strikes > 0 && <span className="score-strikes">{'X'.repeat(strikes)}</span>}
                    </span>
                  </div>
                  <div className="score-right">
                    {pending > 0 && <span className="score-pending">+{pending}</span>}
                    <span className="score-value">{totalScore || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>


          <div className="points-display-row">
            <div className="pts-main neon-card">
               {room.turnInfo.rollCount > 0 ? (
                 <>
                   <span className="pts-label">HOD {room.turnInfo.rollCount}/3</span>
                   <span className="pts-bank">{currentTurnPoints}</span>
                   <span className="pts-selection">+{selectedPoints}</span>
                 </>
               ) : (
                 <span className="pts-label">NA TAHU: {room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}</span>
               )}
            </div>
          </div>

          {doubleStatus?.active && timeLeft > 0 && (
            <div className="double-active-indicator shake glow-text" style={{ textAlign: 'center', marginTop: '-5px', marginBottom: '10px' }}>
               <span className="x2-badge" style={{ verticalAlign: 'middle', fontSize: '1.5rem', padding: '5px 15px' }}>X2</span>
            </div>
          )}

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
                  {doubleStatus?.active && timeLeft > 0 && (
                    <div className="arena-background-timer fade-in" style={{ color: 'rgba(255, 0, 150, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span>{timeLeft}</span>
                    </div>
                  )}
                  <div className="dice-container">
                    {room.turnInfo.lastRoll.length > 0
                      ? renderDice()
                      : <div className="empty-dice-centered neon-text-cyan">PŘIPRAVENO...</div>
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


          <div className="action-stack">
            {isMyTurn ? (
              <div className="btn-row">
                {room.turnInfo.rollCount === 0 ? (
                  <button className="neon-button primary grow-2" onClick={onRoll} disabled={isRolling}>
                    HODIT 🎲
                  </button>
                ) : (
                  <>
                    <button className="neon-button grow-2" onClick={handleRollAgain} disabled={isRolling}>
                      {isRolling ? '⏳ ...' : (room.turnInfo.diceCount - selectedDice.length === 0 ? 'HODIT VŠE' : 'HODIT ZBYTEK')}
                    </button>
                    <button
                      className="neon-button secondary grow-1"
                      onClick={handleStop}
                      disabled={isRolling || (currentTurnPoints + selectedPoints < 350) || (room.turnInfo.diceCount - selectedDice.length === 0)}
                    >
                      BANK ({currentTurnPoints + selectedPoints})
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="wait-pill glass">ČEKÁM NA TAH...</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default GameRoom;

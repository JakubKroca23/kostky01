import React, { useState, useEffect, useRef } from 'react';
import Die from './Die';
import { audio } from '../utils/audio';
import { useDicePhysics } from '../hooks/useDicePhysics';
import { calculateScore } from '@shared/scoring.js';
import { useWebRTC } from '../hooks/useWebRTC';

function RemoteAudioPlayer({ stream }) {
  const audioRef = useRef(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(e => console.warn("Audio autoplay blocked by browser:", e));
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline />;
}

function GameRoom({ socket, room, nickname, remoteSelection, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction, onUpdateSelection, onSendMessage, onlineStats, onLeave, doubleStatus, onUpdateConfig }) {
  const [selectedDice, setSelectedDice] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [isBust, setIsBust] = useState(false);
  const [isReactionsOpen, setIsReactionsOpen] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const [arenaWidth, setArenaWidth] = useState(460);
  const [chatInput, setChatInput] = useState('');
  const [valuesVisible, setValuesVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [doubleEnabled, setDoubleEnabled] = useState(room?.config?.doubleScoreEnabled || false);
  const [doubleInterval, setDoubleInterval] = useState(room?.config?.doubleInterval || 10);
  const [doubleDuration, setDoubleDuration] = useState(room?.config?.doubleDuration || 30);
  const [thiefEnabled, setThiefEnabled] = useState(room?.config?.thiefModeEnabled || false);
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false);
  const [showStealPrompt, setShowStealPrompt] = useState(false);
  const [showStoveAnim, setShowStoveAnim] = useState(false);
  const [myEmoji, setMyEmoji] = useState(localStorage.getItem('kostky-my-emoji') || '🔥');
  const chatRef = useRef(null);
  const arenaRef = useRef(null);

  const { remoteStreams, connectionStates } = useWebRTC(socket, room?.id, socket?.id, voiceChatEnabled);

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

  // Sync state if room config changes from server
  useEffect(() => {
    if (room && room.config) {
      setDoubleEnabled(room.config.doubleScoreEnabled || false);
      setDoubleInterval(room.config.doubleInterval || 5);
      setDoubleDuration(room.config.doubleDuration || 30);
      setThiefEnabled(room.config.thiefModeEnabled || false);
    }
  }, [room.config]);

  // CRITICAL: Guard before any room-dependent logic
  if (!room || !room.turnInfo) return null;

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
  
  const baseSelectedPoints = validSelected.length > 0 
    ? calculateScore(validSelected.map(i => room.turnInfo.lastRoll[i]), room.turnInfo.rollCount === 1).score 
    : 0;
  // Okamžité vizuální znásobení pro právě vybírané kostky
  const selectedPoints = (doubleStatus?.active && timeLeft > 0) ? baseSelectedPoints * 2 : baseSelectedPoints;

  const emojis = [
    '🥴', '🫠', '😵‍💫', '💊', '🥦', '🍄', '🚬', '💉', '🧪', '🧊', 
    '🌿', '🌫️', '🌀', '👺', '🤡', '😈', '💀', '👻', '👁️', '🛸', 
    '🌈', '🍭', '🍺', '🥃', '🍷', '🥂', '🍹', '🧉', '🍾', '🧺'
  ];

  const lastRollCount = useRef(room.turnInfo.rollCount);
  const lastRollId = useRef(rollSeed);

  useEffect(() => {
    // CRITICAL: Reset selection for EVERYONE when a new roll happens or turn changes
    setSelectedDice([]);
    setErrorLocal('');
    // Reset bust state při každém novém tahu nebo hodu
    setIsBust(false);

    // Only roll if it's a NEW roll (different seed or count)
    const isNewRoll = lastRollId.current !== rollSeed || lastRollCount.current !== room.turnInfo.rollCount;
    
    if (room.turnInfo.lastRoll.length > 0 && isNewRoll) {
      setIsRolling(true);
      setValuesVisible(false);
      const timer = setTimeout(() => {
        setIsRolling(false);
        setValuesVisible(true);
      }, 1200);
      lastRollCount.current = room.turnInfo.rollCount;

      // Show steal prompt if it's a straight and thief mode is on
      if (isMyTurn && room.turnInfo.isStraight && room.config.thiefModeEnabled) {
        setTimeout(() => setShowStealPrompt(true), 1300); // Wait for dice animation
      } else {
        setShowStealPrompt(false);
      }

      // Bowling Easter Egg: 4+ fours
      const foursCount = room.turnInfo.lastRoll.filter(d => d === 4).length;
      if (foursCount >= 4) {
        setTimeout(() => setShowStoveAnim(true), 1500);
        setTimeout(() => setShowStoveAnim(false), 5500);
      }

      return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.rollCount, rollSeed, isMyTurn, room.turnInfo.isStraight, room.config.thiefModeEnabled]);

  // Reagování na bust signál — po skončení roll animace zobrazíme lebky
  useEffect(() => {
    if (!room.turnInfo.bustAt) return;

    // Počkáme na konec roll animace (1.2s) a pak ukážeme bust
    const timer = setTimeout(() => {
      setIsBust(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [room.turnInfo.bustAt]);

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

      const canSelect = !isBust && isMyTurn && (room.turnInfo.allowedIndexes || []).includes(index);
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
          isBust={isBust}
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className={`neon-button sm ${voiceChatEnabled ? 'primary' : ''}`} 
              onClick={() => setVoiceChatEnabled(!voiceChatEnabled)}
              title={voiceChatEnabled ? "Vypnout hlasový chat" : "Zapnout hlasový chat"}
              style={{
                 padding: '5px 12px', fontSize: '1.2rem', 
                 borderColor: voiceChatEnabled ? 'var(--neon-green)' : 'var(--glass-border)',
                 textShadow: voiceChatEnabled ? '0 0 10px var(--neon-green)' : 'none',
                 boxShadow: voiceChatEnabled ? '0 0 15px rgba(0, 255, 100, 0.4)' : 'none'
              }}
            >
              {voiceChatEnabled ? '🎙️' : '🔇'}
            </button>
            <button className="neon-button sm logout-btn" onClick={onLeave} title="Odejít z místnosti">Odejít</button>
          </div>
        </div>
        
        <div className="reactions-row-horizontal" style={{ gap: '15px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <button 
               className="reaction-btn-mini current pulse-hover" 
               onClick={() => onReaction(myEmoji)}
               title="Poslat reakci"
               style={{ fontSize: '1.3rem', background: 'rgba(255,255,255,0.08)', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--neon-cyan)' }}
             >
               {myEmoji}
             </button>
             
             <button 
               className={`neon-button sm ${isReactionsOpen ? 'active' : ''}`}
               onClick={() => setIsReactionsOpen(!isReactionsOpen)}
               style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.9rem' }}
               title="Nastavení emoji"
             >
               ⚙️
             </button>
          </div>
          
          {isReactionsOpen && (
            <React.Fragment>
              <div 
                className="modal-overlay" 
                style={{ background: 'rgba(0,0,0,0.6)', zIndex: 9999 }} 
                onClick={() => setIsReactionsOpen(false)} 
              />
              <div className="emoji-picker-dropdown glass neon-card-cyan fade-in" style={{ 
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
                padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.9)', width: '300px', maxWidth: '90vw',
                background: 'rgba(10, 10, 20, 0.98)', border: '2px solid var(--neon-cyan)',
                maxHeight: '400px', overflowY: 'auto', borderRadius: '20px'
              }}>
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, marginBottom: '10px', letterSpacing: '2px' }}>VYBER SI VIBE</div>
                {emojis.map(e => (
                  <button 
                    key={e} 
                    className={`reaction-picker-btn ${myEmoji === e ? 'active' : ''}`}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setMyEmoji(e);
                      localStorage.setItem('kostky-my-emoji', e);
                      setIsReactionsOpen(false);
                    }}
                    style={{ 
                      background: 'rgba(255,255,255,0.03)', border: '1px solid transparent', 
                      cursor: 'pointer', fontSize: '1.4rem', borderRadius: '6px',
                      opacity: myEmoji === e ? 1 : 0.6, transition: '0.2s', padding: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </React.Fragment>
          )}
        </div>
      </div>

      {!room.gameStarted ? (
        <div className="players-grid">
          <h3 className="section-title">PŘIPOJENÍ HRÁČI ({room.players.length}/6)</h3>
          <div className="online-list-horizontal" style={{ marginBottom: '15px', padding: '10px 0' }}>
          {room.players.map((p, i) => (
            <div key={p.id} className="online-user-pill fade-in" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px',
              fontSize: '0.8rem',
              background: i === 0 ? 'rgba(255, 0, 157, 0.1)' : 'rgba(0, 255, 255, 0.1)',
              borderColor: i === 0 ? 'rgba(255, 0, 157, 0.3)' : 'rgba(0, 255, 255, 0.3)',
              color: i === 0 ? 'var(--neon-pink)' : 'var(--neon-cyan)'
            }}>
              <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>{i + 1}.</span>
              <span style={{ fontWeight: 'bold' }}>{p.nickname}</span>
              {i === 0 && <span style={{ fontSize: '0.7rem', filter: 'drop-shadow(0 0 5px var(--neon-pink))' }}>👑</span>}
              {remoteStreams[p.id] && (
                <span title={`Stav spojení: ${connectionStates[p.id] || 'active'}`} style={{ marginLeft: '2px' }}>
                  🔊
                </span>
              )}
            </div>
          ))}
          </div>

        {!room.gameStarted && (
          <div className="host-settings glass neon-card" style={{ marginBottom: '15px', padding: '15px' }}>
            <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '10px' }}>
              {canStart ? 'NASTAVENÍ HRY' : 'PRAVIDLA MÍSTNOSTI'}
            </h3>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <div className="admin-action-row glass" style={{ flex: 1, padding: '10px', margin: 0, opacity: !canStart ? 0.8 : 1, flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                <div className="action-info">
                  <h4 style={{ margin: 0, color: 'var(--neon-pink)', fontSize: '0.85rem' }}>Double Score</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', opacity: 0.7 }}>2x body v intervalech.</p>
                </div>
                {canStart ? (
                  <div className={`admin-toggle ${doubleEnabled ? 'active' : ''}`} 
                       onClick={() => {
                         setDoubleEnabled(!doubleEnabled);
                         onUpdateConfig?.({ doubleScoreEnabled: !doubleEnabled, doubleInterval, doubleDuration });
                       }}>
                     <div className="toggle-handle"></div>
                  </div>
                ) : (
                  <div className={`rule-status-badge ${doubleEnabled ? 'active' : ''}`}>
                    {doubleEnabled ? 'ZAPNUTO' : 'VYPNUTO'}
                  </div>
                )}
              </div>

              <div className="admin-action-row glass" style={{ flex: 1, padding: '10px', margin: 0, opacity: !canStart ? 0.8 : 1, flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                <div className="action-info">
                  <h4 style={{ margin: 0, color: 'var(--neon-cyan)', fontSize: '0.85rem' }}>Zloděj bodů</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.65rem', opacity: 0.7 }}>Krádež 1k při postupce.</p>
                </div>
                {canStart ? (
                  <div className={`admin-toggle ${thiefEnabled ? 'active' : ''}`} 
                       onClick={() => {
                         setThiefEnabled(!thiefEnabled);
                         onUpdateConfig?.({ thiefModeEnabled: !thiefEnabled });
                       }}>
                     <div className="toggle-handle"></div>
                  </div>
                ) : (
                  <div className={`rule-status-badge ${thiefEnabled ? 'active' : ''}`} style={{ borderColor: thiefEnabled ? 'var(--neon-cyan)' : 'var(--glass-border)', color: thiefEnabled ? 'var(--neon-cyan)' : '#888' }}>
                    {thiefEnabled ? 'ZAPNUTO' : 'VYPNUTO'}
                  </div>
                )}
              </div>
            </div>

            {doubleEnabled && (
              <div className="double-settings fade-in" style={{ padding: '10px', marginTop: 0, marginBottom: '15px', background: 'rgba(157, 0, 255, 0.05)', border: '1px dashed var(--neon-purple)', borderRadius: '12px' }}>
                <div className="input-row" style={{ display: 'flex', gap: '10px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '3px', color: '#888' }}>INTERVAL (KOLA)</label>
                    {canStart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                         <button className="neon-button sm" style={{ padding: '5px 10px' }} onClick={() => {
                           const val = Math.max(1, doubleInterval - 1);
                           setDoubleInterval(val);
                           onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval: val, doubleDuration });
                         }}>-</button>
                         <div className="rule-value-box" style={{ flex: 1, textAlign: 'center', padding: '5px' }}>{doubleInterval}</div>
                         <button className="neon-button sm" style={{ padding: '5px 10px' }} onClick={() => {
                           const val = Math.min(100, doubleInterval + 1);
                           setDoubleInterval(val);
                           onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval: val, doubleDuration });
                         }}>+</button>
                      </div>
                    ) : (
                      <div className="rule-value-box" style={{ padding: '5px' }}>{doubleInterval} hodů</div>
                    )}
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.65rem', display: 'block', marginBottom: '3px', color: '#888' }}>TRVÁNÍ (SEK)</label>
                    {canStart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                         <button className="neon-button sm" style={{ padding: '5px 10px' }} onClick={() => {
                           const val = Math.max(5, doubleDuration - 5);
                           setDoubleDuration(val);
                           onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval, doubleDuration: val });
                         }}>-</button>
                         <div className="rule-value-box" style={{ flex: 1, textAlign: 'center', padding: '5px' }}>{doubleDuration}s</div>
                         <button className="neon-button sm" style={{ padding: '5px 10px' }} onClick={() => {
                           const val = Math.min(300, doubleDuration + 5);
                           setDoubleDuration(val);
                           onUpdateConfig?.({ doubleScoreEnabled: doubleEnabled, doubleInterval, doubleDuration: val });
                         }}>+</button>
                      </div>
                    ) : (
                      <div className="rule-value-box" style={{ padding: '5px' }}>{doubleDuration}s</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {canStart ? (
              <button className="neon-button start-hero full-width" onClick={onStart}>🔥 START HRY 🔥 (HOST)</button>
            ) : (
              <div className="wait-pill glass full-width" style={{ textAlign: 'center', padding: '15px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--neon-pink)' }}>
                ⌛ ČEKÁ SE NA START (HOST)...
              </div>
            )}
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
              const isOnFire = strikes >= 2;
              
              return (
                <div key={p.id} className={`score-row ${isActive ? 'active-turn' : ''} ${!hasEntered ? 'waiting-entry' : ''} ${isOnFire ? 'on-fire' : ''}`}>
                  <div className="score-main">
                    <span className="score-name">
                      {isActive ? '🎲 ' : ''}{p.nickname}
                      {isActive && <span className="on-turn-pill">NA TAHU</span>}
                      {strikes > 0 && <span className="score-strikes">{'X'.repeat(strikes)}</span>}
                    </span>
                  </div>
                  <div className="score-right">
                    {isOnFire && <span className="fire-icon-inline">🔥</span>}
                    {pending > 0 && <span className="score-pending">+{pending}</span>}
                    <span className="score-value">{totalScore || 0}</span>
                  </div>
                </div>
              );
            })}
          </div>


          <div className="points-display-row">
            <div className={`pts-main neon-card ${doubleStatus?.active && timeLeft > 0 ? 'pulse-fast double-glow' : ''}`}>
               {room.turnInfo.rollCount > 0 ? (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span className="pts-label">HOD {room.turnInfo.rollCount}/3</span>
                       <span className="pts-bank">{currentTurnPoints}</span>
                     </div>
                     <span className="pts-selection-wrapper">
                        <span className="pts-selection">+{selectedPoints}</span>
                        {doubleStatus?.active && timeLeft > 0 && (
                          <span className="x2-badge-inline pulse-fast">X2</span>
                        )}
                     </span>
                   </div>
                 </>
               ) : (
                 <span className="pts-label pulse-slow" style={{ color: 'var(--neon-cyan)' }}>
                    NA TAHU: {room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}
                 </span>
               )}
            </div>
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
            {nickname.toLowerCase() === 'admin' && isMyTurn && !isRolling && room.turnInfo.rollCount === 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button 
                  onClick={() => socket.emit('force-straight')} 
                  className="neon-button sm" 
                  style={{ flex: 1, borderColor: 'var(--neon-yellow)', color: 'var(--neon-yellow)', background: 'rgba(255, 230, 0, 0.05)', fontSize: '0.7rem' }}
                >
                  🛠️ [DEV] POSTUPKA
                </button>
                <button 
                  onClick={() => socket.emit('force-fours')} 
                  className="neon-button sm" 
                  style={{ flex: 1, borderColor: 'var(--neon-cyan)', color: 'var(--neon-cyan)', background: 'rgba(0, 255, 255, 0.05)', fontSize: '0.7rem' }}
                >
                  🛠️ [DEV] 4x ČTYŘKA
                </button>
              </div>
            )}
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

      {/* Modal pro krádež bodů */}
      {showStealPrompt && (
        <div className="modal-overlay fade-in">
           <div className="glass neon-card steal-modal" style={{ maxWidth: '400px', width: '90%', padding: '30px', textAlign: 'center' }}>
              <h2 className="neon-text-pink" style={{ fontSize: '2rem', marginBottom: '10px' }}>🔥 POSTUPKA! 🔥</h2>
              <p style={{ marginBottom: '25px', opacity: 0.9 }}>Máš čistou postupku! Co uděláš?</p>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                 <button className="neon-button primary" onClick={() => setShowStealPrompt(false)}>
                    PONECHAT SI 2000 BODŮ
                 </button>
                 
                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '10px' }}>
                    <p style={{ fontSize: '0.8rem', marginBottom: '15px', color: 'var(--neon-cyan)' }}>NEBO UKRÁST 1000 BODŮ SOUPEŘI:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                       {room.players.map(p => {
                         if (p.id === socket.id) return null;
                         const pScore = (room.turnInfo.scores && room.turnInfo.scores[p.id]) || 0;
                         return (
                           <button 
                             key={p.id} 
                             className="neon-button sm" 
                             style={{ padding: '8px', fontSize: '0.8rem' }}
                             onClick={() => {
                               socket.emit('steal-points', { targetId: p.id });
                               setShowStealPrompt(false);
                             }}
                           >
                             {p.nickname} ({pScore})
                           </button>
                         );
                       })}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Easter Egg Animace: Sporák */}
      {showStoveAnim && (
        <div className="bowling-overlay fade-in">
           <div className="stove-container">
              <div className="stove-text">SPORÁK! 🔥</div>
              <img src="/202604120723.gif" alt="Sporák" className="stove-img" />
              <div style={{ color: 'white', marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '10px' }}>
                 Už se vaří! 🍳
              </div>
           </div>
        </div>
      )}

      {/* Skryté audio elementy pro Voice Chat */}
      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
         {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <RemoteAudioPlayer key={peerId} stream={stream} />
         ))}
      </div>
    </main>
  );
}

export default GameRoom;

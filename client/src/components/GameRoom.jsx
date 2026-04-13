import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audio';
import { calculateScore } from '@shared/scoring';
import useDicePhysics from '../hooks/useDicePhysics';
import useWebRTC from '../hooks/useWebRTC';
import Die from './Die';
import Scoreboard from './room/Scoreboard';
import GameControls from './room/GameControls';
import RoomChat from './room/RoomChat';
import DiceArena from './room/DiceArena';

function RemoteAudioPlayer({ stream }) {
  const audioRef = useRef();
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay />;
}

function GameRoom({ socket, room, nickname, remoteSelection, onRoll, onRollAgain, onStop, onStart, onDohodit, onReaction, onUpdateSelection, onSendMessage, onlineStats, onLeave, doubleStatus, onUpdateConfig }) {
  const handleRollAgain = () => {
    if (onRollAgain) onRollAgain(selectedDice);
  };

  const handleStop = () => {
    if (onStop) onStop(selectedDice);
  };
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
  
  const arenaRef = useRef(null);
  const { remoteStreams, connectionStates } = useWebRTC(socket, room?.id, socket?.id, voiceChatEnabled);

  useEffect(() => {
    if (!arenaRef.current) return;
    let timeoutId;
    const observer = new ResizeObserver(entries => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        for (let entry of entries) setArenaWidth(entry.contentRect.width);
      }, 50);
    });
    observer.observe(arenaRef.current);
    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!doubleStatus?.active || !doubleStatus?.endsAt) {
      setTimeLeft(0); return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((doubleStatus.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [doubleStatus]);

  useEffect(() => {
    if (room && room.config) {
      setDoubleEnabled(room.config.doubleScoreEnabled || false);
      setDoubleInterval(room.config.doubleInterval || 5);
      setDoubleDuration(room.config.doubleDuration || 30);
      setThiefEnabled(room.config.thiefModeEnabled || false);
    }
  }, [room.config]);

  if (!room || !room.turnInfo) return null;

  const rollSeed = `${room.turnInfo.rollCount}-${room.turnInfo.lastRoll?.join('') || ''}`;
  const logicalWidth = 460;
  const logicalHeight = 340;
  const totalRequiredWidth = 650; // Approximated
  const scale = Math.max(arenaWidth < totalRequiredWidth ? (arenaWidth / totalRequiredWidth) : 1, 0.45);

  const physicsPositions = useDicePhysics(
    room?.turnInfo?.lastRoll?.length || 0,
    isRolling,
    rollSeed,
    logicalWidth,
    logicalHeight
  );

  const myId = room.players.find(p => p.nickname === nickname)?.id;
  const isMyTurn = room.turnInfo.currentTurnId === myId;
  const currentTurnPoints = room.turnInfo.turnPoints || 0;
  
  useEffect(() => {
    if (!isMyTurn && remoteSelection) setSelectedDice(remoteSelection);
  }, [remoteSelection, isMyTurn]);

  const validSelected = selectedDice.filter(i => i < (room.turnInfo.lastRoll?.length || 0));
  const baseSelectedPoints = validSelected.length > 0 
    ? calculateScore(validSelected.map(i => room.turnInfo.lastRoll[i]), room.turnInfo.rollCount === 1).score 
    : 0;
  const selectedPoints = (doubleStatus?.active && timeLeft > 0) ? baseSelectedPoints * 2 : baseSelectedPoints;

  const emojis = ['🥴', '🫠', '😵‍💫', '💊', '🥦', '🍄', '🚬', '💉', '🧪', '🧊', '🌿', '🌫️', '🌀', '👺', '🤡', '😈', '💀', '👻', '👁️', '🛸', '🌈', '🍭', '🍺', '🥃', '🍷', '🥂', '🍹', '🧉', '🍾', '🧺'];
  const lastRollCount = useRef(room.turnInfo.rollCount);
  const lastRollId = useRef(rollSeed);

  useEffect(() => {
    setSelectedDice([]);
    setErrorLocal('');
    setIsBust(false);

    const isNewRoll = lastRollId.current !== rollSeed || lastRollCount.current !== room.turnInfo.rollCount;
    if (room.turnInfo.lastRoll.length > 0 && isNewRoll) {
      setIsRolling(true);
      setValuesVisible(false);
      const timer = setTimeout(() => {
        setIsRolling(false);
        setValuesVisible(true);
      }, 1200);
      lastRollCount.current = room.turnInfo.rollCount;

      if (isMyTurn && room.turnInfo.isStraight && room.config.thiefModeEnabled) {
        setTimeout(() => setShowStealPrompt(true), 1300);
      } else {
        setShowStealPrompt(false);
      }

      const foursCount = room.turnInfo.lastRoll.filter(d => d === 4).length;
      if (foursCount >= 4) {
        setTimeout(() => setShowStoveAnim(true), 1500);
        setTimeout(() => setShowStoveAnim(false), 5500);
      }
      return () => clearTimeout(timer);
    }
  }, [room.turnInfo.currentTurnId, room.turnInfo.rollCount, rollSeed, isMyTurn, room.turnInfo.isStraight, room.config.thiefModeEnabled]);

  useEffect(() => {
    if (!room.turnInfo.bustAt) return;
    const timer = setTimeout(() => setIsBust(true), 1200);
    return () => clearTimeout(timer);
  }, [room.turnInfo.bustAt]);

  const handleDieClick = (index) => {
    if (isRolling || !isMyTurn) return;
    const allowed = room.turnInfo.allowedIndexes || [];
    if (!allowed.includes(index)) return;
    const roll = room.turnInfo.lastRoll || [];
    const dieValue = roll[index];
    let newSelection = [];
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

  return (
    <main className="hero-section game-room-layout">
      {errorLocal && <div className="global-error-toast glass neon-card">{errorLocal}</div>}

      <div className="room-header-neon compact">
        <div className="header-top">
          <h2 className="neon-text-cyan">{room.name} <span className="room-tag-sm">({room.id})</span></h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className={`neon-button sm ${voiceChatEnabled ? 'primary' : ''}`} onClick={() => setVoiceChatEnabled(!voiceChatEnabled)}>
              {voiceChatEnabled ? '🎙️' : '🔇'}
            </button>
            <button className="neon-button sm logout-btn" onClick={onLeave}>Odejít</button>
          </div>
        </div>
        
        <div className="reactions-row-horizontal">
           <button className="reaction-btn-mini current" onClick={() => onReaction(myEmoji)}>{myEmoji}</button>
           <button className="neon-button sm" onClick={() => setIsReactionsOpen(!isReactionsOpen)}>⚙️</button>
           {isReactionsOpen && (
             <div className="emoji-picker-dropdown glass neon-card-cyan fade-in" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000 }}>
                {emojis.map(e => <button key={e} onClick={() => { setMyEmoji(e); setIsReactionsOpen(false); }}>{e}</button>)}
             </div>
           )}
        </div>
      </div>

      <div className="room-main-content">
        <Scoreboard players={room.players} room={room} currentTurnId={room.turnInfo.currentTurnId} />

        <div className="game-arena-column">
          <div className="points-display-row">
            <div className={`pts-main neon-card ${doubleStatus?.active && timeLeft > 0 ? 'pulse-fast double-glow' : ''}`}>
               {room.turnInfo.rollCount > 0 ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="pts-label">HOD {room.turnInfo.rollCount}/3</span>
                      <span className="pts-bank">{currentTurnPoints}</span>
                    </div>
                    <span className="pts-selection">+{selectedPoints}</span>
                 </div>
               ) : (
                 <span className="pts-label pulse-slow">NA TAHU: {room.players.find(p => p.id === room.turnInfo.currentTurnId)?.nickname}</span>
               )}
            </div>
          </div>

          <div className="game-main-horizontal-layout">
            <DiceArena ref={arenaRef} bustMsg={isBust ? "ZKUS TO PŘÍŠTĚ!" : null} showConfetti={false}>
              <div className="dice-content-overlay" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                 {room.turnInfo.lastRoll.map((value, index) => {
                    if (selectedDice.includes(index)) return null;
                    const pos = physicsPositions[index] || { x: 0, y: 0, angle: 0 };
                    return <Die key={index} value={value} isRolling={isRolling} style={{'--tx': `${pos.x}px`, '--ty': `${pos.y}px`, '--tr': `${pos.angle}rad`}} onClick={() => handleDieClick(index)} showValue={valuesVisible} />;
                 })}
              </div>
            </DiceArena>

            <aside className="aside-storage glass">
               <span className="storage-label">ODLOŽENO</span>
               <div className="storage-grid">
                 {(room.turnInfo.storedDice || []).map((val, i) => <div key={i} className="die-stored locked">{val}</div>)}
                 {selectedDice.map((idx, i) => <div key={i} className="die-stored" onClick={() => handleUnselect(i)}>{room.turnInfo.lastRoll[idx]}</div>)}
               </div>
            </aside>
          </div>

          <GameControls 
            isMyTurn={isMyTurn} canRoll={!isRolling} 
            canBank={!isRolling && (currentTurnPoints + selectedPoints >= 350)} 
            canEnterBoard={room.turnInfo.enteredBoard[myId]}
            turnPoints={currentTurnPoints + selectedPoints}
            storedDiceCount={room.turnInfo.storedDice?.length + selectedDice.length}
            onRoll={room.turnInfo.rollCount === 0 ? onRoll : handleRollAgain}
            onBank={handleStop}
            onStartGame={onStart}
            onAddBot={(strategy) => socket.emit('add-bot', strategy)}
            gameStarted={room.gameStarted}
            isHost={myId === room.players[0].id}
            playerCount={room.players.length}
          />
        </div>

        <RoomChat chat={room.turnInfo.chat} chatInput={chatInput} setChatInput={setChatInput} onSendChat={(e) => { e.preventDefault(); if (chatInput.trim()) { onSendMessage(chatInput); setChatInput(''); } }} />
      </div>

      {showStealPrompt && (
        <div className="modal-overlay fade-in">
           <div className="glass neon-card" style={{ padding: '30px', textAlign: 'center' }}>
              <h2 className="neon-text-pink">🔥 POSTUPKA! 🔥</h2>
              <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                 <button className="neon-button" onClick={() => setShowStealPrompt(false)}>PONECHAT 2000 BODŮ</button>
                 {room.players.map(p => p.id !== myId && (
                   <button key={p.id} className="neon-button sm" onClick={() => { socket.emit('steal-points', { targetId: p.id }); setShowStealPrompt(false); }}>UKRÁST OD {p.nickname}</button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {showStoveAnim && (
        <div className="bowling-overlay fade-in">
           <div className="stove-container">
              <div className="stove-text">SPORÁK! 🔥</div>
              <img src="/202604120723.gif" alt="Sporák" className="stove-img" />
           </div>
        </div>
      )}

      <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
         {Object.entries(remoteStreams).map(([peerId, stream]) => <RemoteAudioPlayer key={peerId} stream={stream} />)}
      </div>
    </main>
  );
}

export default GameRoom;

import React, { useState } from 'react';

function Lobby({ rooms, onlineStats, globalChat, leaderboard, onCreateRoom, onJoinRoom, onSendMessage, onReaction }) {
  const [chatInput, setChatInput] = useState('');
  const chatRef = React.useRef(null);

  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [globalChat]);

  const emojis = ['🔥', '😂', '😭', '🎲', '👑', '🎆'];

  const [leadExpanded, setLeadExpanded] = useState(false);

  return (
    <main className="hero-section lobby-layout fade-in">
      {leaderboard && leaderboard.length > 0 && (
        <div 
          className={`lobby-leaderboard-section glass neon-card ${leadExpanded ? 'expanded' : 'rotating-card clickable'}`}
          onClick={() => setLeadExpanded(!leadExpanded)}
        >
          {leadExpanded ? (
            <div className="leaderboard-full-content">
              <header className="leaderboard-expand-header">
                <span className="neon-text-gold">🏆 LEGENDY KOSTEK (TOP 9)</span>
                <span className="expand-hint">Kliknutím sbalit ✕</span>
              </header>
              <div className="leaderboard-mini-wrapper glass">
                <table className="leaderboard-mini-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Hráč</th>
                      <th title="Maximální body v jednom tahu">Max tah</th>
                      <th title="Celkové body za kariéru">Body</th>
                      <th>Výhry</th>
                      <th>Hry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 9).map((p, i) => (
                      <tr key={i} className={i < 3 ? `top-rank-${i + 1}` : ''}>
                        <td className="rank-cell">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td className="nick">{p.nickname}</td>
                        <td className="val">{(p.highScore ?? 0).toLocaleString()}</td>
                        <td className="val pts">{(p.total_points ?? 0).toLocaleString()}</td>
                        <td className="val wins">{p.wins}</td>
                        <td className="val games">{p.games_played}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="leaderboard-rotating-content">
              <span className="mini-title-inline">ŽEBŘÍČEK:</span>
              <div className="rotating-winner-track">
                {leaderboard.slice(0, 3).map((p, i) => (
                  <div key={i} className="rotating-winner-item" style={{ animationDelay: `${i * 3}s` }}>
                    <span className="rank-emoji">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                    <span className="nick">{p.nickname}</span>
                    <span className="stats">
                      <span className="stat-pill wins">{p.wins}W</span>
                      <span className="stat-pill pts">{((p.total_points ?? 0) / 1000).toFixed(1)}k pts</span>
                    </span>
                  </div>
                ))}
              </div>
              <span className="expand-chevron">▼</span>
            </div>
          )}
        </div>
      )}

      <div className="lobby-global-chat glass neon-card">
        <div className="global-chat-messages" ref={chatRef}>
          {(globalChat || []).map((m) => (
            <div key={m.id} className="chat-msg">
              <span className="msg-time">{m.time}</span>
              <span className="msg-sender">{m.sender}:</span>
              <span className="msg-text">{m.text}</span>
            </div>
          ))}
          {(globalChat || []).length === 0 && <div className="chat-empty">Zatím žádné zprávy...</div>}
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
            placeholder="Napiš všem..."
            maxLength={100}
          />
          <button type="submit" className="neon-button sm chat-send">Poslat</button>
        </form>
      </div>

      <div className="lobby-bottom-grid">
        <div className="lobby-side-col">
          <div className="online-players-card neon-card glass">
            <h3 className="section-title">ONLINE HRÁČI ({onlineStats.onlineCount})</h3>
            <div className="online-list-horizontal">
              {onlineStats.players.map((p, i) => (
                <span key={i} className="online-user-pill">{p}</span>
              ))}
            </div>

            <div className="reaction-buttons-row">
              {emojis.map(e => (
                <button key={e} className="reaction-btn" onClick={() => onReaction(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lobby-main-col">
          <div className="lobby-rooms-wrapper">
            <div className="lobby-header">
              <h2 className="neon-text-pink">Aktivní Místnosti</h2>
              <button
                className="neon-button sm primary"
                onClick={() => onCreateRoom({ name: null, config: { doubleScoreEnabled: false, doubleInterval: 10, doubleDuration: 30 } })}
              >
                NOVÁ HRA
              </button>
            </div>

            <div className="room-list">
              {rooms.length === 0 ? (
                <div className="neon-card empty-state">
                  <p>Žádné aktivní hry. Buď první!</p>
                </div>
              ) : (
                rooms.map((room) => (
                  <div key={room.id} className="room-item neon-card glass">
                    <div className="room-info">
                      <h3>{room.name}</h3>
                      <div className="room-player-names">
                        {room.playerNames?.join(', ') || 'Čeká se na hráče...'}
                      </div>
                      <span className="room-id">ID: {room.id}</span>
                    </div>
                    <div className="room-actions">
                      <span className="player-count">
                        {room.playerCount} / {room.maxPlayers}
                      </span>
                      <button
                        className="neon-button sm primary"
                        disabled={room.playerCount >= room.maxPlayers}
                        onClick={() => onJoinRoom(room.id)}
                      >
                        JOIN
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Lobby;

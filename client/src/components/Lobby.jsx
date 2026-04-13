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

  return (
    <main className="hero-section lobby-layout-v2 fade-in">
      <div className="lobby-main-stack">
        {leaderboard && leaderboard.length > 0 && (
          <div className="lobby-leaderboard-minimal">
            <div className="leaderboard-mini-wrapper no-glass">
              <table className="leaderboard-mini-table compact">
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
                  {leaderboard.slice(0, 5).map((p, i) => (
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
        )}

        <section className="lobby-section online-players-compact">
          <div className="section-header-compact">
            <span className="section-label">ONLINE HRÁČI:</span>
            <span className="online-count">({onlineStats.onlineCount})</span>
          </div>
          <div className="online-list-horizontal-compact">
            {onlineStats.players.map((p, i) => (
              <span key={i} className="online-user-pill-sm">{p}</span>
            ))}
          </div>
          <div className="reaction-row-tiny">
            {emojis.map(e => (
              <button key={e} className="reaction-btn-tiny" onClick={() => onReaction(e)}>
                {e}
              </button>
            ))}
          </div>
        </section>

        <section className="lobby-section rooms-compact">
          <div className="section-header-compact">
            <span className="section-label">AKTIVNÍ MÍSTNOSTI:</span>
            <button
              className="neon-button xs primary"
              onClick={() => onCreateRoom({ name: null, config: { doubleScoreEnabled: false, doubleInterval: 10, doubleDuration: 30 } })}
            >
              + NOVÁ HRA
            </button>
          </div>
          <div className="room-list-compact">
            {rooms.length === 0 ? (
              <div className="empty-state-sm">Žádné aktivní hry...</div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="room-item-compact glass">
                  <div className="room-info-sm">
                    <span className="room-name-sm">{room.name}</span>
                    <span className="room-players-sm">({room.playerCount}/{room.maxPlayers})</span>
                  </div>
                  <button
                    className="join-btn-sm"
                    disabled={room.playerCount >= room.maxPlayers}
                    onClick={() => onJoinRoom(room.id)}
                  >
                    VSTOUPIT
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="lobby-side-stack">
        <div className="lobby-global-chat glass neon-card compact-chat">
          <header className="chat-header-compact">Globální Chat</header>
          <div className="global-chat-messages" ref={chatRef}>
            {(globalChat || []).map((m) => (
              <div key={m.id} className="chat-msg">
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
              className="chat-input-sm glass"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Zpráva..."
              maxLength={100}
            />
          </form>
        </div>
      </div>
    </main>
  );
}

export default Lobby;

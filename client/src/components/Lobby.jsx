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
    <main className="hero-section lobby-layout fade-in">
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

        {leaderboard && leaderboard.length > 0 && (
          <div className="lobby-leaderboard-section">
            <h4 className="mini-title">ŽEBŘÍČEK</h4>
            <div className="leaderboard-mini-wrapper glass">
              <table className="leaderboard-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jméno</th>
                    <th title="Max body v tahu">Max tah</th>
                    <th title="Celkové body">Body</th>
                    <th title="Výhry">Výhry</th>
                    <th title="Odehrané hry">Hry</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                      <td className="nick">{p.nickname}</td>
                      <td className="wins">{(p.highScore ?? 0).toLocaleString()}</td>
                      <td className="pts">{(p.total_points ?? 0).toLocaleString()}</td>
                      <td>{p.wins}</td>
                      <td>{p.games_played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      </div>

      <div className="lobby-header">
        <h2 className="neon-text-pink">Aktivní Místnosti</h2>
        <button
          className="neon-button primary"
          onClick={() => onCreateRoom()}
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
    </main>
  );
}

export default Lobby;

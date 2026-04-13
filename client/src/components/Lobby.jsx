import React, { useState, useEffect, useRef } from 'react';

function Lobby({ rooms, nickname, onlineStats, globalChat, leaderboard, onCreateRoom, onJoinRoom, onSendMessage, onReaction, changelog, onUpdateChangelog, appVersion }) {
  const [chatInput, setChatInput] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isEditingChangelog, setIsEditingChangelog] = useState(false);
  const [changelogDraft, setChangelogDraft] = useState('');
  const [versionDraft, setVersionDraft] = useState(appVersion || '1.0');
  const [showHistory, setShowHistory] = useState(false);
  const chatRef = React.useRef(null);
  const isAdmin = nickname?.toLowerCase() === 'admin';

  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [globalChat]);

  React.useEffect(() => {
    setVersionDraft(appVersion || '1.0');
    setChangelogDraft('');
  }, [appVersion]);

  const handleSaveChangelog = () => {
    onUpdateChangelog?.({ version: versionDraft, text: changelogDraft });
    setIsEditingChangelog(false);
    setChangelogDraft('');
  };

  return (
    <main className="hero-section lobby-layout-v2 fade-in">
      <div className="lobby-main-stack">
        {leaderboard && leaderboard.length > 0 && (
          <div className="dual-leaderboard-container">
            {/* LEADERBOARD: MAX TAH */}
            <div className="lobby-leaderboard-flat mini">
              <table className="leaderboard-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>NEJŠÍLENĚJŠÍ TAH 🔥</th>
                    <th>Tah</th>
                  </tr>
                </thead>
                <tbody>
                  {[...leaderboard].sort((a, b) => b.highScore - a.highScore).slice(0, 5).map((p, i) => (
                    <tr key={i} className={i < 3 ? `top-rank-${i + 1}` : ''}>
                      <td className="rank-cell">{i === 0 ? '🏆' : i + 1}</td>
                      <td className="nick">{p.nickname}</td>
                      <td className="val highlight">{(p.highScore ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LEADERBOARD: TOTAL POINTS */}
            <div className="lobby-leaderboard-flat mini">
              <table className="leaderboard-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>PÁNI KOSTEK 👑</th>
                    <th>Body celkem</th>
                  </tr>
                </thead>
                <tbody>
                  {[...leaderboard].sort((a, b) => b.total_points - a.total_points).slice(0, 5).map((p, i) => (
                    <tr key={i} className={i < 3 ? `top-rank-${i + 1}` : ''}>
                      <td className="rank-cell">{i === 0 ? '⭐' : i + 1}</td>
                      <td className="nick">{p.nickname}</td>
                      <td className="val highlight">{(p.total_points ?? 0).toLocaleString()}</td>
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
        </section>

        <section className="lobby-actions-row">
          <button
            className="neon-button sm success create-btn-main"
            onClick={() => onCreateRoom({ name: null, config: { doubleScoreEnabled: false, doubleInterval: 10, doubleDuration: 30 } })}
            style={{ flex: 1 }}
          >
            + VYTVOŘIT HRU
          </button>
          <button
            className="neon-button sm info feedback-toggle-btn"
            onClick={() => setIsFeedbackOpen(true)}
            style={{ width: 'auto', padding: '0 15px' }}
          >
            💬 Zpětná vazba
          </button>
        </section>

        <section className="lobby-section rooms-compact-v3">
          <div className="section-header-compact">
            <span className="section-label">AKTIVNÍ MÍSTNOSTI ({rooms.length})</span>
          </div>
          <div className="room-list-compact-grid">
            {rooms.length === 0 ? (
              <div className="empty-state-sm glass">Žádné aktivní hry...</div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="room-card-mini glass pulse-hover-subtle">
                  <div className="room-meta-left">
                    <span className="room-name-mini">{room.name}</span>
                    <span className="room-count-mini">{room.playerCount}/{room.maxPlayers}</span>
                  </div>
                  <button
                    className="join-mini-btn"
                    disabled={room.playerCount >= room.maxPlayers}
                    onClick={() => onJoinRoom(room.id)}
                  >
                    VS
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="lobby-side-stack">
        <div className="lobby-changelog-section glass neon-card-cyan">
          <header className="changelog-header">
            <span>NOVINKY <span style={{ opacity: 0.5, marginLeft: '5px' }}>v{appVersion}</span> 🚀</span>
            {isAdmin && !isEditingChangelog && (
              <button className="btn-edit-sm" onClick={() => setIsEditingChangelog(true)}>Upravit</button>
            )}
          </header>
          
          <div className="changelog-body">
            {isEditingChangelog ? (
              <div className="changelog-editor">
                <div className="editor-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>NÁZEV NOVÉ VERZE</label>
                  <input 
                    type="text" 
                    value={versionDraft} 
                    onChange={(e) => setVersionDraft(e.target.value)}
                    className="glass-input-sm"
                    style={{ width: '100px' }}
                  />
                </div>
                <textarea 
                  value={changelogDraft} 
                  onChange={(e) => setChangelogDraft(e.target.value)}
                  placeholder="Co je nového? (pomlčky pro odrážky)..."
                />
                <div className="editor-actions">
                  <button className="neon-button sm success" onClick={handleSaveChangelog}>Uložit</button>
                  <button className="neon-button sm" onClick={() => setIsEditingChangelog(false)}>Zrušit</button>
                </div>
              </div>
            ) : (
              <div className="changelog-history">
                {(!Array.isArray(changelog) || changelog.length === 0) ? (
                  <div className="changelog-empty">Zatím žádné záznamy...</div>
                ) : (
                  <>
                    {/* Nejnovější záznam */}
                    <div className="changelog-entry latest">
                      <div className="changelog-entry-header">
                        <span className="changelog-version-tag">AKTUÁLNÍ</span>
                        <span className="changelog-date">{changelog[0].date}</span>
                      </div>
                      <div className="changelog-text">
                        {changelog[0].text.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    </div>

                    {/* Tlačítko pro historii */}
                    {changelog.length > 1 && (
                      <button 
                        className="btn-history-toggle" 
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        {showHistory ? '↑ SKRÝT HISTORII' : '↓ STARŠÍ VERZE'}
                      </button>
                    )}

                    {/* Předchozí záznamy */}
                    {showHistory && changelog.slice(1).map((entry, idx) => (
                      <div key={idx} className="changelog-entry old">
                        <div className="changelog-entry-header">
                          <span className="changelog-version-tag secondary">v{entry.version}</span>
                          <span className="changelog-date">{entry.date}</span>
                        </div>
                        <div className="changelog-text">
                          {entry.text.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="lobby-footer">
        <a href="https://propoj.app" target="_blank" rel="noopener noreferrer">
          &copy; PROPOJ.APP
        </a>
      </footer>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div className="modal-overlay fade-in" onClick={() => setIsFeedbackOpen(false)}>
          <div className="lobby-feedback-modal glass neon-card" onClick={(e) => e.stopPropagation()}>
            <header className="feedback-header">
              <span>Zpětná vazba & Bugy</span>
              <button className="close-btn" onClick={() => setIsFeedbackOpen(false)}>&times;</button>
            </header>
            <div className="feedback-messages" ref={chatRef}>
              {(globalChat || []).map((m) => (
                <div key={m.id} className="feedback-msg">
                  <span className="msg-sender">{m.sender}:</span>
                  <span className="msg-text">{m.text}</span>
                </div>
              ))}
              {(globalChat || []).length === 0 && <div className="feedback-empty">Zatím žádná zpětná vazba...</div>}
            </div>
            <form className="feedback-form" onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) {
                onSendMessage(chatInput);
                setChatInput('');
              }
            }}>
              <input
                type="text"
                className="feedback-input glass"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Napište námět nebo chybu..."
                maxLength={150}
              />
              <button type="submit" className="neon-button sm feedback-send">Odeslat</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Lobby;

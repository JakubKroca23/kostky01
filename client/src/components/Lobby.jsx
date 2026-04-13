import React, { useState, useEffect, useRef } from 'react';

function Lobby({ rooms, nickname, onlineStats, globalChat, leaderboard, onCreateRoom, onJoinRoom, onSendMessage, onReaction, changelog, onUpdateChangelog, onEditChangelog, appVersion }) {
  const [chatInput, setChatInput] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature'); // feature or bug
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDescription, setFeedbackDescription] = useState('');
  const [isEditingChangelog, setIsEditingChangelog] = useState(false);
  const [editingId, setEditingId] = useState(null);
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
    if (editingId) {
      onEditChangelog?.({ id: editingId, version: versionDraft, text: changelogDraft });
    } else {
      onUpdateChangelog?.({ version: versionDraft, text: changelogDraft });
    }
    setIsEditingChangelog(false);
    setEditingId(null);
    setChangelogDraft('');
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setVersionDraft(entry.version);
    setChangelogDraft(entry.text);
    setIsEditingChangelog(true);
  };

  return (
    <main className="hero-section lobby-layout-v2 fade-in">
      <div className="lobby-main-stack">
        {leaderboard && leaderboard.length > 0 && (
          <div className="lobby-leaderboard-flat">
              <table className="leaderboard-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hráč</th>
                    <th title="Maximální body v jednom tahu">MAX V TAHU</th>
                    <th>Body</th>
                    <th>Výhry</th>
                  </tr>
                </thead>
                <tbody>
                  {[...leaderboard].sort((a,b) => b.highScore - a.highScore).slice(0, 10).map((p, i) => (
                    <tr key={i} className={i < 3 ? `top-rank-${i + 1}` : ''}>
                      <td className="rank-cell">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                      <td className="nick">{p.nickname}</td>
                      <td className="val">{(p.highScore ?? 0).toLocaleString()}</td>
                      <td className="val pts">{(p.total_points ?? 0).toLocaleString()}</td>
                      <td className="val wins">{p.wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        <div className="lobby-actions-stack">
          <div className="feedback-row">
            <button
              className="neon-button sm info feedback-toggle-btn half"
              onClick={() => { setFeedbackType('feature'); setIsFeedbackOpen(true); }}
            >
              💡 NÁVRH FUNKCE
            </button>
            <button
              className="neon-button sm danger feedback-toggle-btn half"
              onClick={() => { setFeedbackType('bug'); setIsFeedbackOpen(true); }}
            >
              🐞 NAHLÁSIT CHYBU
            </button>
          </div>
          <button
            className="neon-button create-btn-standard"
            onClick={() => onCreateRoom({ name: null, config: { doubleScoreEnabled: false, doubleInterval: 10, doubleDuration: 30 } })}
          >
            + VYTVOŘIT NOVOU HRU
          </button>
        </div>

        <section className="lobby-section rooms-compact-v3">
          <div className="section-header-compact">
            <span className="section-label">AKTIVNÍ MÍSTNOSTI ({rooms.length})</span>
          </div>
          <div className="room-list-vertical-rows">
            {rooms.length === 0 ? (
              <div className="empty-state-sm glass">Žádné aktivní hry...</div>
            ) : (
              rooms.map((room) => (
                <div key={room.id} className="room-card-mini glass pulse-hover-subtle">
                  <div className="room-meta-left">
                    <div className="room-title-row">
                      <span className="room-name-mini">{room.name}</span>
                      <div className="room-badges">
                        {room.config?.doubleScoreEnabled && <span className="badge-double">2X</span>}
                        {room.config?.thiefModeEnabled && <span className="badge-thief">🥷</span>}
                      </div>
                    </div>
                    <span className="room-count-mini">{room.playerCount}/{room.maxPlayers}</span>
                  </div>
                  <button
                    className="join-btn-ultimate"
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
        <div className="lobby-changelog-section glass neon-card-cyan">
          <header className="changelog-header">
            <span>CO JE NOVÉHO 🚀</span>
            {isAdmin && !isEditingChangelog && (
              <button className="btn-edit-sm" onClick={() => { setEditingId(null); setIsEditingChangelog(true); }}>Nový</button>
            )}
          </header>
          
          <div className="changelog-body">
            <div className="changelog-history">
                {(!Array.isArray(changelog) || changelog.length === 0) ? (
                  <div className="changelog-empty">Zatím žádné záznamy...</div>
                ) : (
                  <>
                    {/* Nejnovější záznam */}
                    <div className="changelog-entry latest">
                      <div className="changelog-entry-header">
                        <span className="changelog-version-tag">AKTUÁLNÍ (v{changelog[0].version})</span>
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
                          {isAdmin && (
                            <button className="btn-edit-inline" onClick={() => startEdit(entry)}>[UPRAVIT]</button>
                          )}
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

      {/* Feedback Modal Redesign */}
      {isFeedbackOpen && (
        <div className="modal-overlay fade-in" onClick={() => setIsFeedbackOpen(false)}>
          <div className={`lobby-feedback-modal-v2 glass neon-card large-modal ${feedbackType === 'bug' ? 'neon-card-pink' : 'neon-card-cyan'}`} onClick={(e) => e.stopPropagation()}>
            <header className="feedback-header">
              <div className="header-labels">
                <span className="main-title">{feedbackType === 'bug' ? '🐞 NAHLÁSIT CHYBU' : '💡 NÁVRH FUNKCE'}</span>
              </div>
              <button className="close-btn" onClick={() => setIsFeedbackOpen(false)}>&times;</button>
            </header>
            
            <div className="feedback-content-area">
              {!isViewingHistory ? (
                /* FORM VIEW */
                <form className="feedback-form-v2" onSubmit={(e) => {
                  e.preventDefault();
                  if (feedbackTitle.trim() && feedbackDescription.trim()) {
                    onSendMessage({ title: feedbackTitle, text: feedbackDescription, type: feedbackType });
                    setFeedbackTitle('');
                    setFeedbackDescription('');
                    setIsViewingHistory(true);
                  }
                }}>
                  <div className="input-group-v2">
                    <input 
                      type="text" 
                      className="glass-input-chat"
                      value={feedbackTitle}
                      onChange={(e) => setFeedbackTitle(e.target.value)}
                      placeholder="NÁZEV..."
                      required
                    />
                  </div>
                  <div className="input-group-v2">
                    <textarea 
                      className="glass-textarea-chat"
                      value={feedbackDescription}
                      onChange={(e) => setFeedbackDescription(e.target.value)}
                      placeholder="VAŠE ZPRÁVA / POPIS..."
                      required
                    />
                  </div>
                  <div className="form-actions-chat">
                    <button type="submit" className={`neon-button sm ${feedbackType === 'bug' ? 'danger' : 'info'}`}>ODESLAT</button>
                    <button type="button" className="neon-button sm" onClick={() => setIsFeedbackOpen(false)}>ZRUŠIT</button>
                    <button type="button" className="neon-button sm secondary" onClick={() => setIsViewingHistory(true)}>SEZNAM</button>
                  </div>
                </form>
              ) : (
                /* HISTORY VIEW */
                <div className="feedback-history-v2">
                  <div className="history-list">
                    {(globalChat || [])
                      .filter(m => m.type === feedbackType)
                      .slice().reverse()
                      .map((m) => (
                      <div key={m.id} className="feedback-card-v2 glass">
                        <div className="card-header-v2">
                          <span className="card-title-v2">{m.title || 'Bez názvu'}</span>
                          <span className="card-time-v2">{m.time}</span>
                        </div>
                        <div className="card-sender-v2">Od: {m.sender}</div>
                        <div className="card-body-v2">{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="form-actions-chat" style={{ marginTop: '15px' }}>
                    <button className="neon-button sm width-100" onClick={() => setIsViewingHistory(false)}>
                      + PŘIDAT NOVÝ
                    </button>
                    <button className="neon-button sm" onClick={() => setIsFeedbackOpen(false)}>ZAVŘÍT</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Changelog Modal */}
      {isAdmin && isEditingChangelog && (
        <div className="modal-overlay fade-in" onClick={() => setIsEditingChangelog(false)}>
          <div className="lobby-feedback-modal-v2 glass neon-card neon-card-cyan" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <header className="feedback-header">
              <div className="header-labels">
                <span className="main-title">🚀 EDITACE CHANGELOGU</span>
              </div>
              <button className="close-btn" onClick={() => setIsEditingChangelog(false)}>&times;</button>
            </header>
            <div className="feedback-content-area">
               <div className="feedback-form-v2">
                  <div className="input-group-v2">
                    <label>VERZE</label>
                    <input 
                      type="text" 
                      value={versionDraft} 
                      onChange={(e) => setVersionDraft(e.target.value)}
                      className="glass-input-v2"
                    />
                  </div>
                  <div className="input-group-v2">
                    <label>TEXT ZMĚN</label>
                    <textarea 
                      value={changelogDraft} 
                      onChange={(e) => setChangelogDraft(e.target.value)}
                      placeholder="Co je nového? (pomlčky pro odrážky)..."
                      className="glass-textarea-v2"
                      style={{ minHeight: '200px' }}
                    />
                  </div>
                  <div className="form-actions-v2">
                    <button className="neon-button success" onClick={handleSaveChangelog}>ULOŽIT</button>
                    <button className="neon-button" onClick={() => setIsEditingChangelog(false)}>ZRUŠIT</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Lobby;

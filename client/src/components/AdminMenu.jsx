import React from 'react';

function AdminMenu({ maintenanceMode, onToggleMaintenance, onClose, players, rooms, onKickPlayer, onDeleteRoom, onClearChat, onResetScoreboard }) {
  return (
    <div className="modal-overlay">
      <div className="admin-modal glass neon-card">
        <div className="modal-header">
           <h2 className="neon-text-cyan">ADMIN PANEL</h2>
           <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="admin-content">
           <div className="admin-action-row">
              <div className="action-info">
                 <h3>Režim údržby</h3>
                 <p>Všichni kromě vás budou vykázáni.</p>
              </div>
              <div className={`admin-toggle ${maintenanceMode ? 'active' : ''}`} 
                   onClick={() => onToggleMaintenance(!maintenanceMode)}>
                 <div className="toggle-handle"></div>
              </div>
           </div>

           <div className="admin-section">
              <h3>Globální Chat</h3>
              <button className="neon-button sm danger" onClick={onClearChat}>Vymazat chat</button>
           </div>

           <div className="admin-section">
              <h3>Skóre tabulka</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '8px' }}>Smaže všechny záznamy v leaderboardu. Nelze vrátit!</p>
              <button className="neon-button sm danger" onClick={() => {
                if (window.confirm('Opravdu chceš resetovat celý scoreboard? Tato akce je nevratná!')) {
                  onResetScoreboard();
                }
              }}>🗑️ Reset Scoreboard</button>
           </div>

           <div className="admin-section">
              <h3>Online Hráči</h3>
              <div className="admin-list">
                 {players.map(p => (
                    <div key={p} className="admin-item">
                       <span>{p}</span>
                       {p.toLowerCase() !== 'admin' && (
                          <button className="neon-button sm danger" onClick={() => onKickPlayer(p)}>Kick</button>
                       )}
                    </div>
                 ))}
                 {players.length === 0 && <p className="empty-text">Nikdo není online.</p>}
              </div>
           </div>

           <div className="admin-section">
              <h3>Aktivní Hry</h3>
              <div className="admin-list">
                 {rooms.map(r => (
                    <div key={r.id} className="admin-item">
                       <span>{r.name} ({r.playerCount} hráčů)</span>
                       <button className="neon-button sm danger" onClick={() => onDeleteRoom(r.id)}>Smazat</button>
                    </div>
                 ))}
                 {rooms.length === 0 && <p className="empty-text">Žádné aktivní hry.</p>}
              </div>
           </div>
        </div>
        
        <div className="admin-footer">
           <p>Uživatel: ADMIN (Vlastník)</p>
        </div>
      </div>
    </div>
  );
}

export default AdminMenu;

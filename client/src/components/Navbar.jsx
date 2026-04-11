import React, { useState } from 'react';

function Navbar({ nickname, soundEnabled, onToggleSound, onLogout, onChangeNickname, onOpenAdmin, isAdmin }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="main-navbar glass">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="dice-icon">🎲</span>
          <h1 className="neon-text-cyan">KOSTKY <span className="logo-v">v1.1</span></h1>
        </div>

        <div className="nav-right">
          <div className="user-profile-nav" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <div className="avatar">{nickname?.substring(0, 2).toUpperCase()}</div>
            <span className="nav-nickname">{nickname}</span>
            <i className={`chevron ${isMenuOpen ? 'up' : 'down'}`}>▼</i>
            
            {isMenuOpen && (
              <div className="nav-dropdown glass neon-card fade-in">
                {isAdmin && (
                  <button onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}>⚙️ Admin Panel</button>
                )}
                <button onClick={() => { onChangeNickname(); setIsMenuOpen(false); }}>✏️ Změnit jméno</button>
                <button onClick={() => { onToggleSound(); setIsMenuOpen(false); }}>
                  {soundEnabled ? '🔊 Zvuk: Zap' : '🔇 Zvuk: Vyp'}
                </button>
                <div className="divider"></div>
                <button className="logout-link" onClick={onLogout}>🚪 Odhlásit</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

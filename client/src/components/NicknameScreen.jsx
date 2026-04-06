import React, { useState } from 'react';

function NicknameScreen({ onJoin, onLogin, onRegister, error }) {
  const [mode, setMode] = useState('quick'); // quick, login, register
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'quick' && nickname.trim().length >= 3) {
      onJoin(nickname.trim());
    } else if (mode === 'login') {
      onLogin(email, password);
    } else if (mode === 'register') {
      onRegister(email, password, nickname);
    }
  };

  return (
    <div className="auth-card glass neon-card">
      <div className="auth-header">
        <h1 className="neon-text-pink">Vítej v Aréně</h1>
        <p className="subtitle">Hra 10 000 — Kostky Multiplayer</p>
      </div>

      <div className="portal-section">
        <a 
          href="https://arena.propoj.app" 
          className="portal-button neon-button full-width large"
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'linear-gradient(45deg, #ff00ff, #00ffff)' }}
        >
          <span style={{ fontSize: '1.2rem' }}>🎮</span>
          Přihlásit se přes Portál Arena
        </a>
        <div className="divider"><span>NEBO HRÁT JAKO HOST</span></div>
      </div>

      <div className="auth-tabs">
        <button 
          className={`tab-btn ${mode === 'quick' ? 'active' : ''}`}
          onClick={() => setMode('quick')}
        >
          Rychlá hra
        </button>
        <button 
          className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
          onClick={() => setMode('login')}
        >
          Přihlásit
        </button>
        <button 
          className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
          onClick={() => setMode('register')}
        >
          Registrovat
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode !== 'login' && (
          <div className="input-group">
            <label>Přezdívka</label>
            <input 
              type="text" 
              placeholder="Zadej jméno (min. 3 znaky)" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              minLength={3}
              required
            />
          </div>
        )}

        {mode !== 'quick' && (
          <>
            <div className="input-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="tvuj@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Heslo</label>
              <input 
                type="password" 
                placeholder="********" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <button type="submit" className="neon-button full-width large">
          {mode === 'quick' ? 'Vstoupit do lobby' : mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
        </button>
      </form>

      {error && <div className="error-text shake">{error}</div>}
      
      <div className="auth-footer">
        {mode === 'quick' ? (
          <p>Hraješ jako host. Tvůj postup se neuloží trvale.</p>
        ) : (
          <p>Používáme zabezpečené připojení Appwrite.</p>
        )}
      </div>
    </div>
  );
}

export default NicknameScreen;

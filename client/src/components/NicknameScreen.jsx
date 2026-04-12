import React, { useState } from 'react';

const FOUNDER_PASSWORD = 'Admin1234';

function NicknameScreen({ onJoin, error }) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const isFounder = nickname.trim().toLowerCase() === 'zakladatel';

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (nickname.trim().length < 3) return;

    if (isFounder) {
      if (password !== FOUNDER_PASSWORD) {
        setLocalError('Špatné heslo pro účet zakladatele.');
        return;
      }
    }

    onJoin(nickname.trim());
  };

  return (
    <div className="auth-card glass neon-card">
      <div className="auth-header">
        <h1 className="neon-text-pink">Vítej v Aréně</h1>
        <p className="subtitle">Hra 10 000 — Kostky Multiplayer</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Přezdívka</label>
          <input
            type="text"
            placeholder="Zadej jméno (min. 3 znaky)"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setLocalError(''); }}
            minLength={3}
            required
          />
        </div>

        {isFounder && (
          <div className="input-group" style={{ marginTop: '12px' }}>
            <label style={{ color: 'var(--neon-cyan)' }}>🔐 Heslo zakladatele</label>
            <input
              type="password"
              placeholder="Zadej heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        )}

        <button type="submit" className="neon-button full-width large" style={{ marginTop: '16px' }}>
          Vstoupit do lobby
        </button>
      </form>

      {(error || localError) && <div className="error-text shake">{localError || error}</div>}
    </div>
  );
}

export default NicknameScreen;

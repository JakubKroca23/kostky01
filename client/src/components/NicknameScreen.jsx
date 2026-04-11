import React, { useState } from 'react';

function NicknameScreen({ onJoin, error }) {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim().length >= 3) {
      onJoin(nickname.trim());
    }
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
            onChange={(e) => setNickname(e.target.value)}
            minLength={3}
            required
          />
        </div>

        <button type="submit" className="neon-button full-width large">
          Vstoupit do lobby
        </button>
      </form>

      {error && <div className="error-text shake">{error}</div>}
    </div>
  );
}

export default NicknameScreen;

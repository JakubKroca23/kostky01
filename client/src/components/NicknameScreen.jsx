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
    <main className="hero-section">
      <div className="neon-card glass">
        <h2>Kdo jsi, cizinče?</h2>
        <p className="subtitle">Zadej svou přezdívku a vstup do neonové arény.</p>
        
        <form onSubmit={handleSubmit} className="nickname-form">
          <div className="input-group">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Tvoje přezdívka..."
              minLength={3}
              maxLength={15}
              required
              autoFocus
              className="neon-input"
            />
            {error && <p className="error-text">{error}</p>}
          </div>
          
          <button type="submit" className="neon-button full-width">
            VSTOUPIT DO HRY
          </button>
        </form>
      </div>
    </main>
  );
}

export default NicknameScreen;

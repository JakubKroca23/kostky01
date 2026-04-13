import React, { useState } from 'react';

const ADMIN_PASSWORD = 'kostky01'; // Nové heslo

function NicknameScreen({ onJoin, error, leaderboard }) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const isAdmin = nickname.trim().toLowerCase() === 'admin';

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (nickname.trim().length < 3) return;

    if (isAdmin) {
      if (password !== ADMIN_PASSWORD) {
        setLocalError('Špatné heslo pro účet ADMIN.');
        return;
      }
    }

    onJoin(nickname.trim(), password);
  };

  return (
    <div className="auth-wrapper-inner">
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
              autoFocus
            />
          </div>

          {isAdmin && (
            <div className="input-group" style={{ marginTop: '12px' }}>
              <label style={{ color: 'var(--neon-cyan)' }}>🔐 Admin Heslo</label>
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

      {leaderboard && leaderboard.length > 0 && (
        <div className="lobby-leaderboard-flat" style={{ marginTop: '20px' }}>
              <table className="leaderboard-mini-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Hráč</th>
                    <th title="Maximální body v jednom tahu">Tah</th>
                    <th>Body</th>
                    <th>Výhry</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
      )}
    </div>
  );
}

export default NicknameScreen;

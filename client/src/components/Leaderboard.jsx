import React from 'react';

function Leaderboard({ list, onClose }) {
  return (
    <div className="modal-overlay fade-in">
      <div className="leaderboard-modal glass neon-card">
        <header className="leaderboard-header">
          <h2 className="neon-text-gold">🏆 Legenda Kostek</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>

        <div className="leaderboard-content">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Pořadí</th>
                <th>Hráč</th>
                <th>Výhry</th>
                <th>Průměr na hod</th>
                <th className="hide-mobile">Hry</th>
              </tr>
            </thead>
            <tbody>
              {list.map((player, index) => {
                const avg = player.total_rolls > 0 
                  ? (player.total_points / player.total_rolls).toFixed(1) 
                  : '0.0';
                
                return (
                  <tr key={index} className={`rank-${index + 1}`}>
                    <td className="rank-col">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="nickname-col">{player.nickname}</td>
                    <td className="wins-col">{player.wins}</td>
                    <td className="points-col">{avg} pts</td>
                    <td className="hide-mobile">{player.games_played}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    Zatím tu nikdo není... buď první šampion! 🎲
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;

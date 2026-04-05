import React from 'react';

function MaintenanceOverlay() {
  return (
    <div className="maintenance-overlay fade-in">
      <div className="maintenance-card glass neon-card">
        <div className="maintenance-icon">🚧</div>
        <h1 className="neon-text-pink">PROBÍHÁ ÚDRŽBA</h1>
        <p>Aréna se momentálně připravuje na nové updaty.</p>
        <div className="status-badge offline">OFFLINE REŽIM</div>
        <div className="maintenance-footer">
          Zkuste to prosím později. Děkujeme za trpělivost!
        </div>
      </div>
    </div>
  );
}

export default MaintenanceOverlay;

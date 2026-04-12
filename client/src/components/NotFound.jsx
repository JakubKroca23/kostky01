import React from 'react';

function NotFound({ onReturn }) {
  return (
    <div className="hero-section glass" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '20px' }}>
      <div className="notfound-content fade-in">
        <h1 className="neon-text-pink" style={{ fontSize: '8rem', margin: 0 }}>404</h1>
        <div className="cube-3d-wrap" style={{ margin: '40px auto' }}>
          <div className="die-stored locked" style={{ width: '80px', height: '80px', fontSize: '3rem', margin: '0 auto', boxShadow: '0 0 30px var(--neon-pink)', border: '2px solid white' }}>?</div>
        </div>
        <h2 className="neon-text-cyan" style={{ marginBottom: '20px' }}>TATO MÍSTNOST NEEXISTUJE</h2>
        <p style={{ color: '#888', maxWidth: '400px', margin: '0 auto 30px' }}>
          Vypadá to, že jsi zabloudil v digitální prázdnotě. Kostky byly vrženy, ale tato cesta nikam nevede.
        </p>
        <button className="neon-button primary start-hero" onClick={onReturn}>
          ZPĚT DO LOBBY
        </button>
      </div>

      <style>{`
        .cube-3d-wrap {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

export default NotFound;

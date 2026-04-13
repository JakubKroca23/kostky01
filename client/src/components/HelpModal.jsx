import React from 'react';

function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="help-modal glass neon-card-cyan" onClick={(e) => e.stopPropagation()}>
        <header className="help-header">
          <h2 className="neon-text-cyan">NÁPOVĚDA A PRAVIDLA</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="help-content">
          <section>
            <h3>🏠 LOBBY</h3>
            <p>V lobby můžeš sledovat online hráče, číst zpětnou vazbu od ostatních a hlavně se připojit k existujícím hrám nebo vytvořit vlastní.</p>
            <ul>
              <li><strong>Vytvořit hru:</strong> Založí novou místnost. Jako hostitel máš právo měnit nastavení a spustit hru.</li>
              <li><strong>Žebříček:</strong> Ukazuje 5 nejlepších hráčů podle vyhraných her a celkových bodů.</li>
            </ul>
          </section>

          <section>
            <h3>⚙️ NASTAVENÍ HRY (HOST)</h3>
            <p>Hostitel může před startem aktivovat speciální módy:</p>
            <ul>
              <li><strong>Double Score:</strong> V pravidelných intervalech (počet hodů) se na určitou dobu aktivuje 2x násobek bodů.</li>
              <li><strong>Zloděj bodů:</strong> Pokud někdo hodí čistou postupku (1-6), může si vybrat, zda si nechá 2000 bodů, nebo ukradne 1000 bodů náhodnému soupeři.</li>
            </ul>
          </section>

          <section>
            <h3>🎲 PRAVIDLA A MECHANIKA</h3>
            <p>Cílem hry je dosáhnout <strong>10 000 bodů</strong>. Hráči se střídají v hodech 6 kostkami.</p>
            <ol>
              <li>Hoď kostkami a vyber ty, které skórují (1, 5, trojice, postupka).</li>
              <li>Body z vybraných kostek se přičtou k tvým bodům v daném tahu.</li>
              <li>Můžeš házet znovu se zbývajícími kostkami, nebo si body zapsat (<strong>BANK</strong>), pokud máš v daném hodu alespoň 350 bodů.</li>
              <li>Pokud po hodu žádná kostka neskóruje, nastává <strong>BUST</strong> — ztrácíš všechny body nasbírané v tomto kole a tah končí.</li>
              <li>Pokud vybereš všech 6 kostek, můžeš házet znovu se všemi (pokračuješ v sérii).</li>
            </ol>
          </section>

          <section>
            <h3>💎 BODOVÁNÍ</h3>
            <ul>
              <li><strong>Jedna 1:</strong> 100 bodů | <strong>Jedna 5:</strong> 50 bodů</li>
              <li><strong>Tři 1:</strong> 1000 bodů | <strong>Tři stejné (ostatní):</strong> 100x hodnota (např. tři 4 = 400 b.)</li>
              <li><strong>Čistá postupka (1-6):</strong> 2000 bodů</li>
              <li><strong>Tři páry:</strong> 1000 bodů</li>
            </ul>
          </section>
        </div>

        <button className="neon-button full-width" onClick={onClose}>ROZUMÍM</button>
      </div>
    </div>
  );
}

export default HelpModal;

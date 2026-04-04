---
phase: 6
plan: 3
wave: 3
depends_on: [6-2]
files_modified:
  - server/index.js
  - client/src/App.jsx
  - client/src/components/GameRoom.jsx
autonomous: true
must_haves:
  truths:
    - "Při 5/6 kostek k postupce nebo párům server nabídne 'dohodit' možnost"
    - "Klient zobrazí nabídku a hráč může přijmout nebo odmítnout"
    - "Odmítnutí: hra pokračuje normálně (kostky nejsou zmraženy)"
    - "Přijetí a neúspěch: tah končí s 0 body + bust čárkou"
    - "Přijetí a úspěch: normální bodování postupky/párů"
---

# Plan 6.3: Server + Client — "Dohodit" Mechanika

<objective>
Implementovat volitelnou "dohodit" mechaniku: pokud hráč hodí 5/6 kostek potřebných
k postupce nebo párům v 1. hodu, server detekuje tuto situaci a nabídne hráči šanci
dohodit chybějící kostku.

Purpose: Přidává strategické rozhodnutí a dramatické napětí do 1. hodu.
Output: Nový socket event `can-complete-special` + UI dialog v GameRoom.
</objective>

<context>
Load for context:
- server/index.js
- client/src/App.jsx
- client/src/components/GameRoom.jsx
</context>

<tasks>

<task type="auto">
  <name>Server: detekce "5 z 6" a handler pro dohazování</name>
  <files>server/index.js</files>
  <action>
    Přidat detekci "téměř postupky" nebo "téměř tří párů" do roll-dice handleru (POUZE pro rollCount === 1).

    DETEKCE POSTUPKY (5/6):
    - Postupka = přesně {1,2,3,4,5,6}. Pokud dice (6 kostek) obsahuje 5 unikátních hodnot z těchto 6, jedna chybí.
    - Identifikovat chybějící hodnotu (missingValue).

    DETEKCE TŘÍ PÁRŮ (5/6):
    - Tři páry = každá ze 3 hodnot se vyskytuje 2x (např. 2,2,3,3,5,5).
    - "Skoro páry" = 5 kostek tvoří 2 kompletní páry + 1 zbývající (neúplný pár).
    - Identifikovat chybějící hodnotu (libovolná ze zbývající kostky — hráč hází 1 kostkou).

    EMIT EVENTU:
    ```js
    // Pokud detekováno a rollCount === 1
    if (canComplete) {
      io.to(room.id).emit('can-complete-special', {
        type: 'postupka' | 'pary',
        frozenIndexes: [0,1,2,3,4], // indexy 5 zmrazených kostek
        missingValue,               // jakou hodnotu je třeba hodit
        currentRoll: roll
      });
      room.turnInfo.awaitingCompletionDecision = true;
      return; // Čekat na rozhodnutí hráče
    }
    ```

    NOVÉ HANDLERY:
    ```js
    socket.on('accept-completion', () => {
      // Hráč chce dohodit — hodit 1 kostkou
      const singleRoll = [Math.floor(Math.random() * 6) + 1];
      room.turnInfo.awaitingCompletionDecision = false;
      const needed = room.turnInfo.neededCompletionValue; // uložit při detekci
      if (singleRoll[0] === needed) {
        // Úspěch → normální bodování (postupka/páry)
        const fullRoll = [...frozenDice, singleRoll[0]]; // rekonstruovat
        io.to(room.id).emit('completion-result', { success: true, finalRoll: fullRoll });
      } else {
        // Neúspěch → bust + čárka
        io.to(room.id).emit('completion-result', { success: false, bust: true });
        // + přidat čárku jako bust
        nextTurn(room);
      }
    });

    socket.on('decline-completion', () => {
      // Hráč odmítl → pokračovat normálně s původním hodem
      room.turnInfo.awaitingCompletionDecision = false;
      // Emit normální dice-rolled s původním rollem
      const { score, usedIndexes } = calculateScore(room.turnInfo.lastRoll);
      io.to(room.id).emit('dice-rolled', { roll: room.turnInfo.lastRoll, turnPoints: 0, allowedIndexes: usedIndexes });
    });
    ```

    AVOID: Nestrikovat detekci — pouze v rollCount === 1 a pouze pokud score === 0 (nebo postupka/páry ještě nejsou kompletní).
  </action>
  <verify>Ručně otestovat: hodit [1,2,3,4,5,x] kde x≠6 → server emituje can-complete-special.</verify>
  <done>Server detekuje 5/6 situaci a čeká na rozhodnutí hráče.</done>
</task>

<task type="auto">
  <name>Client: UI dialog pro "dohodit" + zpracování completion-result</name>
  <files>client/src/App.jsx, client/src/components/GameRoom.jsx</files>
  <action>
    App.jsx — přidat state a socket handlery:
    ```js
    const [completionOffer, setCompletionOffer] = useState(null);
    // { type: 'postupka'|'pary', frozenIndexes, missingValue, currentRoll }

    function onCanCompleteSpecial(data) {
      setCompletionOffer(data);
    }

    function onCompletionResult(data) {
      setCompletionOffer(null);
      if (data.success) {
        // Zpracovat jako normální dice-rolled s finalRoll
        audio.playScore();
      } else {
        audio.playBust();
        setError('Nedohodil! 0 bodů za tah.');
        setTimeout(() => setError(''), 3000);
      }
    }

    const handleAcceptCompletion = () => socket.emit('accept-completion');
    const handleDeclineCompletion = () => {
      setCompletionOffer(null);
      socket.emit('decline-completion');
    };
    ```

    GameRoom.jsx — zobrazit dialog pokud completionOffer !== null:
    ```jsx
    {completionOffer && (
      <div className="completion-offer neon-card glass">
        <p>Máš 5/6 kostek k <strong>{completionOffer.type}</strong>!</p>
        <p>Chceš dohodit <strong>{completionOffer.missingValue}</strong>?</p>
        <p className="completion-warning">⚠️ Neúspěch = 0 bodů za tah</p>
        <div className="completion-buttons">
          <button className="neon-button primary" onClick={onAccept}>DOHODIT</button>
          <button className="neon-button" onClick={onDecline}>ODMÍTNOUT</button>
        </div>
      </div>
    )}
    ```

    Přidat CSS třídy: `.completion-offer`, `.completion-warning`, `.completion-buttons`.

    AVOID: Nezobrazovat dialog soupeři (pouze currentTurnId === socket.id).
  </action>
  <verify>Vizuálně ověřit: dialog se zobrazí, přijetí/odmítnutí funguje, animace odpovídají.</verify>
  <done>Hráč vidí nabídku, může přijmout/odmítnout, výsledek se správně zpracuje.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] 5/6 kostek k postupce → dialog se zobrazí
- [ ] Odmítnutí → hra pokračuje normálně
- [ ] Přijetí + správná hodnota → postupka/páry se bodují
- [ ] Přijetí + špatná hodnota → bust, čárka, přechod tahu
</verification>

<success_criteria>
- [ ] Mechanika funguje end-to-end
- [ ] Dialog se zobrazuje pouze aktivnímu hráči
- [ ] Zvukové efekty odpovídají výsledku
</success_criteria>

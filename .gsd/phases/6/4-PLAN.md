---
phase: 6
plan: 4
wave: 4
depends_on: [6-2, 6-3]
files_modified:
  - client/src/components/GameRoom.jsx
  - client/src/App.jsx
  - client/src/index.css
autonomous: false
must_haves:
  truths:
    - "Scoreboard zobrazuje čárky u každého hráče (0-2 čárky jako ▪ ikony)"
    - "Kliknutí na kostku trojice/více odloží celou kombinaci najednou"
    - "Jedničky a pětky jsou při 1x nebo 2x výskytu vybíratelné po jedné"
    - "Po hodu jsou barevně zvýrazněny kostky které lze odložit"
    - "stop-error se zobrazí v UI jako toast zpráva"
---

# Plan 6.4: UI — Scoreboard s čárkami + Inteligentní výběr kostek

<objective>
Upgradovat herní UI o:
1. Scoreboard: zobrazit čárky vedle skóre každého hráče
2. Inteligentní výběr kostek: klik na kostku trojice/více odloží celou kombinaci
3. Zvýraznění odložitelných kostek po hodu
4. stop-error toast notifikace

Purpose: Herní zážitek musí odpovídat novým pravidlům — správný výběr kostek je zásadní.
Output: Aktualizovaný GameRoom.jsx + index.css.
</objective>

<context>
Load for context:
- client/src/components/GameRoom.jsx
- client/src/App.jsx
- client/src/index.css
- server/utils/scoring.js (pro pochopení allowedIndexes)
</context>

<tasks>

<task type="auto">
  <name>Scoreboard: čárky + stop-error toast</name>
  <files>client/src/components/GameRoom.jsx, client/src/App.jsx, client/src/index.css</files>
  <action>
    SCOREBOARD ČÁRKY:
    App.jsx — přijímat strikes z dice-rolled a score-updated eventů:
    ```js
    // V onDiceRolled a onScoreUpdated handleru
    setCurrentRoom(prev => ({
      ...prev,
      turnInfo: {
        ...prev.turnInfo,
        strikes: data.strikes || prev.turnInfo.strikes || {}
      }
    }));
    ```

    GameRoom.jsx — zobrazit čárky vedle skóre:
    ```jsx
    const strikes = room.turnInfo?.strikes || {};
    // V score-row:
    <div className="score-strikes">
      {[...Array(strikes[player.id] || 0)].map((_, i) => (
        <span key={i} className="strike-mark">▪</span>
      ))}
    </div>
    ```

    CSS:
    ```css
    .score-strikes { display: flex; gap: 3px; align-items: center; }
    .strike-mark { color: #ff3e3e; font-size: 1.2rem; text-shadow: 0 0 6px #ff3e3e; }
    ```

    STOP-ERROR TOAST:
    App.jsx — naslouchat na `stop-error` event:
    ```js
    socket.on('stop-error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 4000);
    });
    ```

    CSS — odlišný styl pro stop-error (oranžový) vs bust-error (červený):
    `.global-error-toast.warning { color: var(--neon-gold); border-color: var(--neon-gold) !important; }`

    AVOID: Nezobrazovat socket.id v scoreboard — zobrazovat přezdívky (player.nickname).
  </action>
  <verify>Vizuálně: čárky se zobrazují, po 3 čárkách skóre na 0, stop-error toast se zobrazí.</verify>
  <done>Scoreboard obsahuje čárky, toast notifikace funguje.</done>
</task>

<task type="checkpoint:human-verify">
  <name>Inteligentní výběr kostek: klik na trojici odloží celou kombinaci</name>
  <files>client/src/components/GameRoom.jsx</files>
  <action>
    Aktualizovat logiku výběru kostek v GameRoom.jsx:

    PRAVIDLA VÝBĚRU (dle specifikace bod 2):
    - Po hodu server vrátí `allowedIndexes` = indexy kostek s body.
    - Kliknutí na kostku která je součástí trojice/více (tj. tři nebo více kostek se stejnou hodnotou):
      → automaticky VYBRAT všechny kostky té hodnoty najednou (whole-combination select).
    - Kliknutí na jedničku nebo pětku (při count === 1 nebo 2):
      → normální toggle výběru po jedné.
    - Kliknutí na jedničku/pětku při count === 3:
      → vybrat celou trojici najednou (stejné chování jako ostatní hodnoty).

    IMPLEMENTACE:
    ```js
    function handleDieClick(index) {
      const val = currentRoll[index];
      const countInRoll = currentRoll.filter(v => v === val).length;
      const isIndividuallySelectable = (val === 1 || val === 5) && countInRoll < 3;

      if (isIndividuallySelectable) {
        // Toggle jednotlivé kostky
        toggleSingleDie(index);
      } else {
        // Vybrat/zrušit celou kombinaci hodnoty
        toggleWholeCombination(val);
      }
    }

    function toggleWholeCombination(val) {
      const combinationIndexes = allowedIndexes.filter(i => currentRoll[i] === val);
      const allSelected = combinationIndexes.every(i => selected.includes(i));
      if (allSelected) {
        setSelected(prev => prev.filter(i => !combinationIndexes.includes(i)));
      } else {
        setSelected(prev => [...new Set([...prev, ...combinationIndexes])]);
      }
    }
    ```

    Po výběru: barevně zvýraznit allowedIndexes (lze vybrat) vs ostatní (šedé).
    allowedIndexes → třída `can-select` (existující CSS).
    Nepovolené indexy (nejsou v allowedIndexes) → pointer-events: none nebo opacity: 0.3.

    AVOID: Nenechat hráče kliknout na kostky které nejsou v allowedIndexes.
  </action>
  <verify>
    Ruční test:
    1. Hodit [2,2,2,1,5,3] → lze kliknout na jednu dvojku → odloží se všechny 3 dvojky najednou
    2. Hodit [1,1,5,2,3,4] → lze kliknout na jednu jedničku (z dvou) → odloží se jen ta jedna
    3. Hodit [1,1,1,5,3,4] → klik na jedničku → odloží se všechny 3 jedničky najednou
  </verify>
  <done>
    Výběr kostek respektuje pravidla: trojice a více = celá kombinace,
    1 nebo 2 jedničky/pětky = po jedné.
  </done>
</task>

<task type="auto">
  <name>Physics Refinement: Přesné odrazy od okrajů (bez překryvu)</name>
  <files>client/src/hooks/useDicePhysics.js, client/src/index.css</files>
  <action>
    Synchronizovat rozměry kostek v Matter.js a CSS.

    1. V useDicePhysics.js:
       - Změnit `DIE_SIZE` z 66 na **74** (odpovídá 70px + 2*2px border v CSS).
    2. V index.css:
       - Ověřit, že `.dice-body` má přesně tyto rozměry.
    3. Ladění odrazů:
       - V useDicePhysics.js zajistit, že těla se tvoří jako `Matter.Bodies.rectangle(x, y, 74, 74)`.
       - Pokud se kostka stále "půlí" o hranu, přidat do wallOpts malý `slop` nebo mírně posunout stěny o 2-3px vně arény.

    AVOID: Změnit DIE_SIZE v JS bez ohledu na CSS — musí být identické, jinak dochází k vizuálnímu překryvu.
  </action>
  <verify>Ruční test: Kostky se odráží přesně hranou od stěny arény a nikdy se nepřekrývají s okrajem.</verify>
  <done>Kolizní model Matter.js odpovídá vizuálnímu modelu v browseru.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Scoreboard zobrazuje čárky (▪) správně
- [ ] Klik na trojici odloží celou kombinaci
- [ ] Klik na jednu z dvou jedniček odloží jen ji
- [ ] stop-error toast se zobrazí při pokusu o stop s < 350b
- [ ] Kostky se odráží bez překryvu s okraji (Edge Bounce)
</verification>

<success_criteria>
- [ ] Všechna UI a fyzikální pravidla implementována
- [ ] checkpoint:human-verify schválen uživatelem
- [ ] Hra hratelná end-to-end s novými pravidly a čistou fyzikou
</success_criteria>

# Detailní průběh Phase 3: Herní mechaniky

Phase 3 byla zaměřena na implementaci kompletní herní logiky "10 000" na straně serveru a její propojení s uživatelským rozhraním.

### Provedené kroky

1.  **Scoring Engine (`server/utils/scoring.js`)**:
    *   Implementována kompletní pravidla bodování dle domluvy:
        *   Jedničky (100b), Pětky (50b).
        *   Troja až šestice (násobení x2 pro každou další kostku, jedničky startují na 1000b).
        *   Velká postupka (1-6) za **2000b**.
        *   Tři dvojice za **700b**.
    *   Vytvořen ověřovací skript `server/tests/test-scoring.js` (8/8 testů PASS).

2.  **Turn & State Management (`server/index.js`)**:
    *   Rozšířen model `room` o `turnInfo` (aktivní hráč, body v tahu, počet hodů, celkové skóre).
    *   Implementováno pravidlo **350 bodů do 3. hodu**. Pokud hráč do 3. hodu (včetně) nedosáhne 350b, tah končí jako "Zelenáč".
    *   Implementován **Hot Dice** (znovuhod): Pokud hráč boduje všemi 6 kostkami, získá novou sadu 6 kostek a pokračuje v tahu.

3.  **Real-time Integration**:
    *   Nové socket eventy: `start-game`, `roll-dice`, `stop-turn`.
    *   Broadcastování stavu hry (`turn-updated`, `dice-rolled`, `score-updated`) všem hráčům v místnosti.
    *   Ochrana proti tahům mimo pořadí na straně serveru.

4.  **UI Gameplay (`GameRoom.jsx` & `index.css`)**:
    *   Vytvořen scoreboard s indikací aktivního hráče (neonový border).
    *   Zobrazení kostek (čísla v neonových kartách) a statistik tahu (body, počet hodů).
    *   Implementovány globální error toasty pro oznámení "ZELENÁČE" nebo nesplnění limitu 350b.

### Faktory úspěchu
*   Hra je nyní plně hratelná v multiplayeru.
*   Logika je centralizovaná na serveru, což brání podvádění.
*   UI reflektuje real-time stav bez nutnosti refreshování.

### Další kroky
*   **Phase 4: Visuals & UX (Animations)**: Nahrazení čísel vizuálními kostkami, 3D/CSS animace hodu, zvukové efekty.

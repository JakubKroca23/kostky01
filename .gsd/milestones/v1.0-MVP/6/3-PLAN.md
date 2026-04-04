---
phase: 6
plan: 3
wave: 2
---

# Plan 6.3: Scoring UX & Final Round UI

## Objective
Vylepšit uživatelské rozhraní tak, aby jasně komunikovalo pravidlo 350 bodů pro vstup na board a probíhající Závěrečné kolo.

## Context
- client/src/components/GameRoom.jsx
- client/src/index.css

## Tasks

<task type="auto">
  <name>Scoreboard Status Indicators</name>
  <files>client/src/components/GameRoom.jsx, client/src/index.css</files>
  <action>
    Vylepšit Scoreboard (tabulku skóre) pro informaci o vstupu:
    - Vedle jména hráče, který ještě není na boardu (`!room.turnInfo.enteredBoard[p.id]`), zobrazit malou ikonu zámku 🔒 nebo text neutralizující "Potřebuje 350".
    - Stylovat pomocí CSS `.score-row.waiting-entry`.
  </action>
  <verify>Ruční ověření, že u nového hráče svítí indikátor zámku.</verify>
  <done>Uživatel ví, proč nemůže zapisovat malé bodové částky na začátku hry.</done>
</task>

<task type="auto">
  <name>Final Round Banner & UI</name>
  <files>client/src/components/GameRoom.jsx, client/src/index.css</files>
  <action>
    Přidat do herní plochy vizuální upozornění na Závěrečné kolo:
    - Pokud `room.isFinalRound === true`, zobrazit v záhlaví blikající text "ZÁVĚREČNÉ KOLO - POSLEDNÍ ŠANCE!".
    - Seznam zbývajících hráčů (`room.turnInfo.finalRoundPlayers`) může být zvýrazněn.
  </action>
  <verify>Ruční testování: Simulovat konec hry a ověřit zobrazení baneru.</verify>
  <done>Konec hry je dramatický a srozumitelný.</done>
</task>

## Success Criteria
- [ ] UI jasně rozlišuje hráče, kteří "vstoupili" na board.
- [ ] Probíhá vizuální upozornění na Final Round.

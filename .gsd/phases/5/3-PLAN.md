---
phase: 5
plan: 3
wave: 2
---

# Plan 5.3: Victory Screen & Final Polish

## Objective
Detekce vítězství (10 000 bodů) a implementace závěrečného obrazu s konfetami/neonovou fanfárou.

## Context
- server/index.js
- client/src/components/VictoryModal.jsx
- client/src/index.css

## Tasks

<task type="auto">
  <name>Win Condition Detection</name>
  <files>server/index.js, client/src/App.jsx</files>
  <action>
    Detekovat dosažení 10 000 bodů u jednoho z hárčů.
    - Server: Při započtení bodů v `stop-turn` zkontrolovat, zda `totalScore >= 10000`.
    - Pokud ano, poslat event `game-over`.
  </action>
  <verify>Ruční testování: Simulovat vysoký zisk (změnou celkového skóre v konzoli serveru) a dohrání kola.</verify>
  <done>Hra korektně detekuje vítěze hned po dosažení limitu.</done>
</task>

<task type="auto">
  <name>Victory Modal Creation</name>
  <files>client/src/components/VictoryModal.jsx, client/src/index.css</files>
  <action>
    Vytvořit MODAL okno pro oslavu vítězství.
    - Zobrazit text "Vítěz: [NICKNAME]".
    - Přidat vizuální "feyre" (neonový puls, konfety z kyanu/růžové).
    - Tlačítko "Nová hra" (vrátí hráče do lobby).
  </action>
  <verify>Při eventu `game-over` vyskočí okno s vítězem.</verify>
  <done>Závěr hry je důstojný a odměňuje vítěze.</done>
</task>

## Success Criteria
- [ ] Celá hra lze dohrát od Lobby přes 10 000 bodů až po Victory screen.
- [ ] UI vypadá pixel-perfect a aplikace je stabilní.
- [ ] Všechny funkcionality ze SPEC.md a REQUIREMENTS.md jsou splněny a ověřeny.

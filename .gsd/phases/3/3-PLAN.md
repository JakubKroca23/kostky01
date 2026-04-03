---
phase: 3
plan: 3
wave: 2
---

# Plan 3.3: Real-time Communication Integration

## Objective
Propojení frontendových akcí hodu se serverovou logikou a real-time aktualizace bodů všech hráčů.

## Context
- .gsd/SPEC.md
- client/src/App.jsx
- server/index.js

## Tasks

<task type="auto">
  <name>Dice Sync (Roll/Keep Socket Events)</name>
  <files>server/index.js, client/src/App.jsx</files>
  <action>
    Implementovat socket eventy hodu.
    - `roll-dice`: Server hodí zbývajícími kostkami (1-6) a pošle `dice-rolled`.
    - `keep-dice`: Client pošle, které kostky chce ponechat (`indexes`).
    - `confirm-turn`: Zápis bodů.
    - Odesílat `update-game-state`: Úplný stav místnosti po každém hodu (skóre, aktuální házející, vybrané kostky).
  </action>
  <verify>Dva prohlížeče -> Jeden hodí -> Druhý vidí v záhlaví, co padlo (čísla) a aktuální skóre protihráče.</verify>
  <done>Uživatelé v místnosti vidí real-time průběh tahů ostatních a své získané body.</done>
</task>

<task type="auto">
  <name>Basic Game UI Status Integration</name>
  <files>client/src/components/GameRoom.jsx, client/src/index.css</files>
  <action>
    Integraovat herní stav do UI.
    - Zobrazit v `GameRoom` tabulku skóre (celkové body).
    - Tlačítka "HODIT" (pokud je hráč na řadě) a "ZAPSAT BODY".
    - Indikace, kdo právě hází (neon border na aktivním hráči).
  </action>
  <verify>Ruční ověření, že tlačítka se objevují a fungují dle turn indexu.</verify>
  <done>Uživatel může reálně hrát proti ostatním a vidí tabulku skóre.</done>
</task>

## Success Criteria
- [ ] Celá hra lze odehrát v 2+ hráčích (hod, výběr kostek, konec tahu).
- [ ] Body se sčítají a zobrazují v reálném čase.
- [ ] Jsou blokovány akce hráče, který není na řadě (validace na serveru).

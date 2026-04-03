---
phase: 2
plan: 2
wave: 2
---

# Plan 2.2: Lobby Room Management

## Objective
Implementace logiky pro vytváření a správu herních místností na serveru a zobrazení seznamu aktivních her v lobby.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- client/src/App.jsx
- server/index.js

## Tasks

<task type="auto">
  <name>Server-side Room State & List</name>
  <files>server/index.js</files>
  <action>
    Implementovat správu místností na serveru.
    - Udržovat seznam aktivních místností (id, název, počet hráčů, maxPlayers: 6).
    - Event `create-room`: vytvoření místnosti a automatické připojení zakladatele.
    - Limitovat místnost na **min: 2, max: 6** hráčů (validace na serveru).
    - Pravidelné vysílání (`broadcast`) aktualizovaného seznamu místností při změně stavu.
  </action>
  <verify>Logování v konzoli serveru pro `create-room` s limitem 6 hráčů.</verify>
  <done>Server spravuje kolekci místností s limity a vysílá ji klientům.</done>
</task>

<task type="auto">
  <name>Lobby View Implementation</name>
  <files>client/src/components/Lobby.jsx, client/src/index.css</files>
  <action>
    Vytvořit hlavní zobrazení lobby.
    - Zobrazení seznamu dostupných her (neon list).
    - Tlačítko "ZALOŽIT NOVOU HRU" s modálním oknem nebo inputem pro název hry.
    - Dynamické aktualizace seznamu přes socket.
    - Integrovat do App.jsx (stav 'lobby').
  </action>
  <verify>Dva prohlížeče -> Jeden založí hru -> Druhý ji uvidí v seznamu v reálném čase.</verify>
  <done>Uživatel vidí seznam her a může iniciovat vytvoření nové.</done>
</task>

## Success Criteria
- [ ] Lobby zobrazuje seznam všech aktuálně běžících/čekajících her.
- [ ] Je možné vytvořit novou místnost s vlastním názvem.
- [ ] Všichni připojení hráči v lobby vidí nové místnosti okamžitě bez refreshe.

---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Nickname Entry & Socket Identity

## Objective
Implementace rozhraní pro zadání přezdívky a její synchronizaci se serverem pro identifikaci hráčů před vstupem do lobby.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- client/src/App.jsx
- server/index.js

## Tasks

<task type="auto">
  <name>Nickname Screen UI</name>
  <files>client/src/components/NicknameScreen.jsx, client/src/index.css</files>
  <action>
    Vytvořit komponentu pro zadání přezdívky s neonovým designem.
    - Input pole pro nickname (validace min. 3 znaky).
    - Tlačítko "POTVRDIT" s neonovým glow efektem.
    - Přidat potřebné styly do index.css (neon inputs, glassmorphism containers).
    - Integrovat do App.jsx pomocí nového stavového stroje (screens: 'nickname', 'lobby', 'room').
  </action>
  <verify>Ruční ověření, že se po startu aplikace zobrazí zadání přezdívky a po kliknutí na potvrdit se změní stav aplikace.</verify>
  <done>Input pole funguje, vizuálně ladí s neonem a ukládá nickname do lokálního stavu Reactu.</done>
</task>

<task type="auto">
  <name>Server-side Player Identity & Collision Handling</name>
  <files>server/index.js, client/src/App.jsx</files>
  <action>
    Implementovat synchronizaci přezdívky se serverem a kontrolu unikátnosti.
    - Udržovat na serveru globální `Map` aktivních hráčů (přezdívka -> socketId).
    - Event `set-nickname`: pokud už jméno existuje, emitovat chybu `nickname-taken`.
    - Pokud je jméno volné, server uloží `socket.data.nickname` a pošle potvrzení `nickname-set`.
    - Frontend zobrazí chybovou hlášku, pokud je jméno obsazené.
  </action>
  <verify>Dva prohlížeče -> Oba zkusí zadat stejné jméno -> Druhý dostane chybovou hlášku "Jméno je již obsazeno".</verify>
  <done>Server garantuje unikátnost přezdívek pro online hráče a frontend adekvátně reaguje.</done>
</task>

## Success Criteria
- [ ] Uživatel po vstupu na web vidí stylový neonový prompt pro přezdívku.
- [ ] Server ví, jak se hráč jmenuje (identifikace přes socket).
- [ ] Aplikace přechází do stavu 'lobby' po zadání jména.

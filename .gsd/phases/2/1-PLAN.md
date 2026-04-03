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
  <name>Server-side Player Identity</name>
  <files>server/index.js, client/src/App.jsx</files>
  <action>
    Implementovat synchronizaci přezdívky se serverem.
    - Přidat socket event `set-nickname` na serveru.
    - Server uloží přezdívku do `socket.data.nickname` a vrátí potvrzení.
    - Client odešle přezdívku po potvrzení ve frontendu.
    - Logovat připojení hráče s jeho přezdívkou v konzoli serveru pro debug.
  </action>
  <verify>npm run dev (frontend + backend) -> Zadat jméno -> Zkontrolovat log v konzoli serveru: "Player [Jméno] registered".</verify>
  <done>Socket na serveru má přiřazenou přezdívku a client se úspěšně ohlásí.</done>
</task>

## Success Criteria
- [ ] Uživatel po vstupu na web vidí stylový neonový prompt pro přezdívku.
- [ ] Server ví, jak se hráč jmenuje (identifikace přes socket).
- [ ] Aplikace přechází do stavu 'lobby' po zadání jména.

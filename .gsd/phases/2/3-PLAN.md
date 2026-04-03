---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Join & Room View

## Objective
Implementace připojení k místnosti a základního herního náhledu s přítomnými hráči.

## Context
- .gsd/SPEC.md
- .gsd/ROADMAP.md
- client/src/App.jsx
- server/index.js

## Tasks

<task type="auto">
  <name>Join Room Logic & Navigation</name>
  <files>server/index.js, client/src/components/Lobby.jsx, client/src/App.jsx</files>
  <action>
    Implementovat mechanismus vstupu do již vytvořené místnosti.
    - Event `join-room`: server přidá socket do místnosti a pošle `room-joined`.
    - Pokud je místnost plná (např. > 4 hráči), odeslat chybu.
    - Frontend reaguje na `room-joined` přechodem do stavu 'room'.
    - Uložit aktuální `roomId` v lokálním stavu klienta.
  </action>
  <verify>Dva prohlížeče -> Jeden vytvoří -> Druhý klikne na [PŘIPOJIT] -> Oba se octnou v herní místnosti.</verify>
  <done>Uživatel se úspěšně připojí do vybrané místnosti a změní pohled aplikace.</done>
</task>

<task type="auto">
  <name>Room Navigation & Rejoin Logic</name>
  <files>client/src/components/GameRoom.jsx, server/index.js</files>
  <action>
    Vytvořit komponentu místnosti a pořešit odpojení.
    - Záhlaví s názvem místnosti a seznamem hráčů.
    - Implementovat `rejoin`: Pokud se klient odpojí a znovu připojí se stejným jménem do stejné místnosti (během timeoutu), server jej znovu propojí s jeho herním stavem.
    - Tlačítko "OPUSTIT HRU" (leave-room event back to lobby).
  </action>
  <verify>Refresh prohlížeče v místnosti -> Aplikace si pamatuje nick a automaticky se vrátí do stejné místnosti (pokud existuje).</verify>
  <done>Uživatel se může vrátit do hry i po krátkém výpadku spojení.</done>
</task>

## Success Criteria
- [ ] Kliknutí na existující hru v lobby úspěšně přesměruje hráče do této hry.
- [ ] Uvnitř hry jsou vidět přezdívky všech aktuálně připojených uživatelů.
- [ ] Funkční tlačítko pro odchod z místnosti zpět do lobby.

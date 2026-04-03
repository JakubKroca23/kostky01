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
  <name>Room Header & Player List</name>
  <files>client/src/components/GameRoom.jsx, client/src/index.css</files>
  <action>
    Vytvořit komponentu pro zobrazení uvnitř místnosti.
    - Záhlaví s názvem místnosti a unikátním ID.
    - Seznam všech hráčů v místnosti s jejich přezdívkami.
    - Tlačítko "OPUSTIT HRU" (leave-room event back to lobby).
    - Styling hráčských čipů (neon badges).
  </action>
  <verify>Ruční ověření po vstupu do hry -> Vidím sebe a ostatní připojené hráče s jejich jmény.</verify>
  <done>Uživatel vidí, kdo je s ním v místnosti a má možnost se vrátit do lobby.</done>
</task>

## Success Criteria
- [ ] Kliknutí na existující hru v lobby úspěšně přesměruje hráče do této hry.
- [ ] Uvnitř hry jsou vidět přezdívky všech aktuálně připojených uživatelů.
- [ ] Funkční tlačítko pro odchod z místnosti zpět do lobby.

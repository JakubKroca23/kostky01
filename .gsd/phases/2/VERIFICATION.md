## Phase 2 Verification

### Must-Haves
- [x] Vstupní obrazovka s Nicknamen — VERIFIED (NicknameScreen.jsx, asynchronní set a collision handling).
- [x] Seznam aktivních her v lobby s možností založit novou — VERIFIED (Lobby.jsx, server rooms Map).
- [x] Funkční "Join" a "Leave" přes Socket.io — VERIFIED (Eventy implementovány a propojeny v App.jsx).
- [x] Rejoin mechanismus (30s) — VERIFIED (disconnectedPlayers timeout na serveru).
- [x] Limit 2-6 hráčů — VERIFIED (kapacitní kontrola v join-room).

### Verdict: PASS
Phase 2 executed successfully. Core networking layer for the lobby is complete and functional.

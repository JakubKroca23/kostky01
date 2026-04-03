# ROADMAP.md

> **Current Phase**: Phase 1: Foundation
> **Milestone**: v1.0 (Multiplayer MVP)

## Must-Haves (from SPEC)
- [ ] Funkční real-time lobby (vstoupení s přezdívkou)
- [ ] Implementace pravidel hry 10 000 na serveru
- [ ] Neonový herní board s animacemi hodu kostkou
- [ ] Responsivní design pro mobilní zařízení

## Phases

### Phase 1: Založení projektu (Foundation)
**Status**: ✅ Complete
**Objective**: Nastavení infrastruktury pro frontend i backend.
**Requirements**: REQ-13, REQ-14, REQ-15
**Deliverables**: 
- Git repozitář s Vite (React) a Express/Socket.io serverem.
- Inicializace CSS design systému (neon tokens).

### Phase 2: Lobby & Real-time (Networking)
**Status**: ✅ Complete
**Objective**: Implementace lobby, vytváření místností a synchronizace uživatelů.
**Requirements**: REQ-01, REQ-07, REQ-10
**Deliverables**: 
- Vstupní obrazovka s Nicknamen.
- Seznam aktivních her v lobby s možností založit novou.
- Funkční "Join" a "Leave" přes Socket.io.

### Phase 3: Herní mechaniky (Game Logic)
**Status**: ✅ Complete
**Objective**: Kompletní implementace pravidel 10 000 na serveru.
**Requirements**: REQ-03, REQ-04, REQ-05
**Deliverables**: 
- Scoring Engine (utils/scoring.js).
- Turn & State Management (Turn logic, 350 min, Hot Dice).
- Multiplayer Sync (Socket events, Scoreboard).

### Phase 4: Visuals & UX (Animations)
**Status**: ⬜ Ready
**Objective**: Nahrazení čísel vizuálními kostkami, animace.
**Objective**: Neonový vzhled a "smooth" animace.
**Requirements**: REQ-08, REQ-09, REQ-11, REQ-12
**Deliverables**: 
- Die.jsx (Neon 3D-like dice).
- Roll/Throw animations.
- Combo highlights/glow.
- Neonový herní stůl s "glow" efekty.
- Závěrečné doladění pro mobilní displeje (Portrait).

### Phase 5: SFX & Music (Polish)
**Status**: ⬜ Not Started
**Objective**: Zvukové efekty hodu a pozadí.
**Requirements**: REQ-02
**Deliverables**: 
- Audio assets (dice roll, score, win).
- Sound toggle menu.

# ROADMAP.md

> **Current Phase**: -
> **Milestone**: Next Milestone

## Must-Haves (from SPEC)
- [x] Funkční real-time lobby (vstoupení s přezdívkou)
- [x] Implementace pravidel hry 10 000 na serveru
- [x] Neonový herní board s animacemi hodu kostkou
- [x] Responsivní design pro mobilní zařízení

## Phases

### Phase 7: Gap Closure (Address Technical Debt)
**Status**: ✅ Completed
**Objective**: Fix persistence, shared logic, and error handling from the v1.0 milestone audit.

**Gaps to Close:**
- [x] **State Persistence**: Prohibit data loss by implementing a simple session storage for rooms.
- [x] **DRY Scoring**: Unify scoring logic between client and server to prevent drift.
- [x] **Socket Resilience**: Improve client-side handling of disconnects and timeouts.

> Previous milestone "v1.0 (Multiplayer MVP)" archived in `.gsd/milestones/v1.0-MVP/`

## Next Steps
1. /new-milestone — Start planning the next big update (e.g. Animations, Skins, Multiplayer++ )

---
*Run `/new-milestone` to define the next set of phases.*

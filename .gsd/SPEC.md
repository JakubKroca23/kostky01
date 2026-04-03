# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Vytvořit moderní, vizuálně působivou (neon style) webovou hru "10 000" s reálným multiplayerem, která je plně optimalizovaná pro mobilní telefony (na výšku) a přístupná přes jednoduché lobby bez nutnosti registrace.

## Goals
1. **Multiplayer v reálném čase**: Systém lobby, kde hráči vidí aktivní hry a mohou se k nim připojit nebo založit vlastní.
2. **Neon Design & Animace**: Prvotřídní vizuální zážitek s plynulými animacemi hodu kostkou a zářivými efekty.
3. **Pravidla 10 000**: Plná implementace klasických pravidel (350 bodů vstup, postupky, tři dvojice, závěrečné kolo).
4. **Mobile-First**: Design optimalizovaný pro ovládání jednou rukou na mobilu (orientace na výšku).

## Non-Goals (Out of Scope)
- Trvalé uživatelské účty a historie her (v této verzi pouze session-based).
- Hraní proti AI (pouze multiplayer).
- Pokročilé sociální funkce (friend list, soukromé zprávy).
- Zvukové efekty (prozatím bez audia).

## Users
Hráči, kteří si chtějí rychle zahrát "10 000" s přáteli nebo náhodnými lidmi online, bez zbytečného klikání a registrací.

## Constraints
- **Technologie**: React (Vite) + Vanilla CSS + Node.js (Socket.io).
- **Layout**: Striktně na výšku (Portrait) pro mobilní zařízení.
- **Vizuální styl**: Neonový, tmavý režim (Dark mode).

## Success Criteria
- [ ] Stabilní spojení mezi hráči přes WebSockets.
- [ ] Funkční pravidla hry (detekce kombinací, počítání bodů).
- [ ] Animace hodu kostkou vypadají "smooth" a profesionálně.
- [ ] Lobby zobrazuje seznam her a aktuální počet připojených hráčů.

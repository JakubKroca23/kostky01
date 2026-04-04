---
phase: 6
plan: 1
wave: 1
---

# Plan 6.1: Unified Scoring Engine

## Objective
Sjednotit výpočty bodů mezi klientem a serverem a zajistit 100% soulad s klasickými pravidly 10 000 (včetne postupky a tří dvojic).

## Context
- .gsd/phases/6/DISCOVERY.md
- client/src/utils/scoring.js
- server/utils/scoring.js

## Tasks

<task type="auto">
  <name>Unified Scoring Utility Rewrite</name>
  <files>client/src/utils/scoring.js, server/utils/scoring.js</files>
  <action>
    Kompletně přepsat `calculateScore` tak, aby byl identický v obou souborech.
    Nová implementace musí:
    - 1. Detekovat **Velkou postupku (1-6)** = 2000b.
    - 2. Detekovat **Tři dvojice** = 700b (podle specifikace).
    - 3. Detekovat **Násobky (3, 4, 5, 6 stejných)** pomocí progresivního výpočtu (X * 100 * 2^(count-3) pro X!=1, 1000 * 2^(count-3) pro X=1).
    - 4. Detekovat osamocené 1 a 5.
    - 5. Vrátit `usedIndexes` pro vizuální odlišení v UI.
  </action>
  <verify>Ruční testování hodu '1,1,1,1,2,2' (výsledek 2000b).</verify>
  <done>Logika je synchronizovaná a pokrývá všechny kombinace v obou prostředích.</done>
</task>

<task type="auto">
  <name>Scoring Unit Tests</name>
  <files>server/tests/scoring.test.js</files>
  <action>
    Vytvořit jednoduchý testovací skript pro `calculateScore` pokrývající:
    - Prázdný hod (0b)
    - Postupka (2000b)
    - Tři dvojice (700b)
    - Šest stejných (např. '1,1,1,1,1,1' = 8000b)
    - Sestava bez bodů (Zelenáč)
    Spustit skript pomocí `node server/tests/scoring.test.js`.
  </action>
  <verify>Výstup testu v konzoli vypisuje "All tests passed".</verify>
  <done>Máme záruku správnosti bodování bez nutnosti manuálních kliků v UI.</done>
</task>

## Success Criteria
- [ ] Klient i server používají IDENTICKOU logiku bodování.
- [ ] Detekce postupky a tří dvojic funguje spolehlivě.
- [ ] Bodování násobků je progresivní (např. 4x '1' je 2000b, ne 1100b).

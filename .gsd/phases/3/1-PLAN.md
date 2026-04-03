---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Scoring Engine & Logic

## Objective
Vytvoření robustního algoritmu pro detekci kombinací v kostkách (10 000) na straně serveru.

## Context
- .gsd/SPEC.md
- server/index.js (pro integraci později)

## Tasks

<task type="auto">
  <name>Scoring Utility Implementation</name>
  <files>server/utils/scoring.js</files>
  <action>
    Vytvořit soubor pro herní logiku.
    - Exportovat funkci `calculateScore(dice)`, která vrátí `{ points, usedIndexes, isBust }`.
    - Implementovat pravidla: 
      - Jedničky (100b), Pětky (50b).
      - Trojice až šestice (100-800x hodnota, u jedniček 1000-8000b).
      - Velká postupka (1-6) = 1500b.
      - Tři dvojice (např. 2,2, 4,4, 6,6) = 1000b.
    - Zajistit, aby algoritmus prioritizoval nejvyšší kombinace.
  </action>
  <verify>Ruční ověření pomocí testovacího skriptu (např. v konzoli volání calculateScore([1,1,1,2,3,5])).</verify>
  <done>Algoritmus správně vrací body pro všechny standardní kombinace hry 10 000.</done>
</task>

<task type="auto">
  <name>Logic Verification Script</name>
  <files>server/tests/test-scoring.js</files>
  <action>
    Vytvořit jednoduchý "smoke test" pro skórovací logiku.
    - Pokrýt případy: jediná 1, postupka, tři dvojice, šestice stejných, "Zelenáč" (0 bodů).
    - Ověřit, že se funkce nezacyklí a vrací správné indexy použitých kostek.
  </action>
  <verify>node server/tests/test-scoring.js</verify>
  <done>Testy procházejí a potvrzují přesnost bodování.</done>
</task>

## Success Criteria
- [ ] Funkce calculateScore bezchybně detekuje všechny kombinace ze zadání.
- [ ] Testovací skript potvrzuje správnost pro alespoň 10 hraničních případů.

---
phase: 3
plan: 2
wave: 2
---

# Plan 3.2: Turn State Management

## Objective
Implementace server-side stavu tahu, přepínání hráčů a pravidla minimálního vstupu (350b).

## Context
- .gsd/SPEC.md
- server/index.js

## Tasks

<task type="auto">
  <name>Game State Extension & Turn Flow</name>
  <files>server/index.js</files>
  <action>
    Rozšířit objekt `room` o herní data.
    - `turnInfo`: { currentPlayerIndex, turnPoints, currentRollCount, totalPointsMap }.
    - Funkce `startTurn()`: resetuje stav tahu a počet hodů.
    - Pravidlo vstupu: Hráč musí dosáhnout 350b nejpozději při 3. hodu v rámci tahu.
    - Implementovat "Hot Dice": pokud hráč bodoval všemi 6 kostkami (i postupně), získá opět 6 kostek k hodu.
  </action>
  <verify>Logování v konzoli serveru pro `next-turn` a průběžné body (turnPoints) po každém hodu.</verify>
  <done>Server ví, čí je řada, kolik má hráč bodů a kdo už "otevřel" hru 350-bodovým hitem.</done>
</task>

<task type="auto">
  <name>Bust & Hot Dice Mechanism</name>
  <files>server/index.js</files>
  <action>
    Implementovat automatické ukončení tahu při nule ("Zelenáč").
    - Pokud `calculateScore` vrací 0 u hodu (isBust), nastavit `turnPoints` na 0 a poslat `next-turn`.
    - Pokud jsou všechny kostky v místnosti bodovací (usedDiceCount == 6), poslat signál pro "Hot Dice" (další hod se 6 kostkami).
  </action>
  <verify>Simulace hodu bez 1, 5 a kombinací -> Tah okamžitě končí s nulou a následuje další hráč.</verify>
  <done>Pravidla Bust a Hot Dice korektně vynucují konec nebo prodloužení tahu.</done>
</task>

## Success Criteria
- [ ] Hra automaticky přechází na dalšího hráče po hodu bez bodů.
- [ ] Hráč si může zapsat body do celkového skóre pouze pokud jsou >= 350 (u prvního vstupu).
- [ ] Stav místnosti (`rooms.get(id)`) obsahuje aktuální tabulku skóre všech hráčů.

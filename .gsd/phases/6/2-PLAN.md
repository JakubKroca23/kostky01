---
phase: 6
plan: 2
wave: 2
---

# Plan 6.2: Entry Points & Final Round Logic

## Objective
Implementovat serverovou logiku pro vstupní skóre 350 bodů (první zápis do boardu) a "Závěrečné kolo" při dosažení 10 000 bodů.

## Context
- server/index.js
- server/utils/scoring.js

## Tasks

<task type="auto">
  <name>350 Entry Score Rule</name>
  <files>server/index.js</files>
  <action>
    Modifikovat state místnosti a metodu `stop-turn`.
    - Inicializovat `enteredBoard: { [playerId]: false }` v `room.turnInfo`.
    - V `stop-turn`: Pokud `!enteredBoard[playerId]`, povolit zápis pouze pokud `turnPoints >= 350`. Pokud ne, vyhodit Socket chybu "Pro první zápis potřebuješ alespoň 350 bodů."
    - Po úspěšném prvním zápisu nastavit `enteredBoard[playerId] = true`.
  </action>
  <verify>Ruční testování: Zkusit ukončit tah s 100 nebo 200 body bez předchozího vstupu na board.</verify>
  <done>Pravidlo 350 bodů pro vstup do hry je funkční a synchronizované přes Sockets.</done>
</task>

<task type="auto">
  <name>Final Round Implementation</name>
  <files>server/index.js</files>
  <action>
    Modifikovat konec hry tak, aby při skóre >= 10 000 neproběhl okamžitý `game-over`.
    - Do místnosti přidat `isFinalRound: false` a `finalRoundPlayers: string[]`.
    - Když někdo dosáhne 10k: nastavit `isFinalRound = true` a `finalRoundPlayers` naplnit seznamem ID všech ostatních hráčů v místnosti.
    - Po každém dalším tahu v Závěrečném kole odebrat aktivního hráče z `finalRoundPlayers`.
    - Jakmile je `finalRoundPlayers` prázdný, odeslat `game-over` s finálním vítězem (může jím být i někdo jiný, kdo vítěze v posledním kole předežene!).
  </action>
  <verify>Ruční testování ve 2 hráčích: Hráč A hodí 10k, Hráč B má ještě jeden tah (může hodit více!).</verify>
  <done>Konec hry je spravedlivý a odpovídá pravidlům.</done>
</task>

## Success Criteria
- [ ] Zákaz zápisu s méně než 350 body v prvním tahu.
- [ ] Vítězství je dohráno jedním závěrečným kolem všech zbývajících hráčů.

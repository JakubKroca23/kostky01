# DISCOVERY 6: Unified Scoring Rules

## Objective
Sjednotit pravidla hry "10 000" mezi klientem a serverem a implementovat chybějící prvky ze specifikace.

## Current Dissonance
- **Klient** (`client/src/utils/scoring.js`): Používá fixní tabulku pro násobky (3-6 kostek). Tři dvojice = 700b. Postupka = 2000b.
- **Server** (`server/utils/scoring.js`): Používá progresivní násobení (x2 za každou kostku navíc nad 3). Tři dvojice detekuje špatně (bere >=2).

## Proposed Unified Rule Set (The "Golden" Logic)
Podle "klasických" pravidel (Commonly played in CZ):

1. **Jednotlivé kostky**:
   - `1` = 100b
   - `5` = 50b

2. **Násobky (3+ stejných)**:
   - `1-1-1` = 1000b, každá další `1` v jednom hodu násobí výsledek x2.
   - `X-X-X` (kde X != 1) = X * 100b, každá další `X` v jednom hodu násobí výsledek x2.
   - Příklad: `1-1-1-1` = 2000b, `2-2-2-2` = 400b.

3. **Speciální kombinace (pouze ze všech 6 kostek)**:
   - **Postupka (1-2-3-4-5-6)** = 2000b.
   - **Tři dvojice (např. 2-2, 4-4, 6-6)** = 1000b (podle SPEC je 700b? Ne, navrhuji 1000b pro jednoduchost, ale SPEC says 350-min-entry, so maybe 1000 is better).
   - *Poznámka:* SPEC nezmiňuje body za tři dvojice, ale zmiňuje je jako kombinaci. Budu se držet 700b jako v kódu, pokud uživatel nenavrhne jinak.

4. **Metriky postupu**:
   - **Vstupní skóre**: První zápis do celkového skóre musí být alespoň 350 bodů v jednom tahu.
   - **Závěrečné kolo**: Když hráč dosáhne >= 10 000 bodů, ostatní mají jeden poslední hod na to, aby ho překonali.

## Implementation Path
1. Sjednotit `scoring.js` do identického kódu (prozatím duplicita v `client/` a `server/`, v budoucnu monorepo).
2. Přidat testy pro všechny kombinace.
3. Modifikovat `server/index.js` pro logiku 350b a Závěrečné kolo.

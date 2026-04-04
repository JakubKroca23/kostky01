---
phase: 6
plan: 1
type: tdd
wave: 1
depends_on: []
files_modified:
  - server/utils/scoring.js
  - server/tests/test-scoring.js
autonomous: true
must_haves:
  truths:
    - "Bodovací tabulka je přesně dle specifikace (pevné hodnoty, ne progresivní násobení)"
    - "Postupka a páry jsou detekovány správně"
    - "Osamocené 1 a 5 se bodují po jedné (nikoliv jako trojice)"
  artifacts:
    - "server/tests/test-scoring.js — minimum 25 testovacích případů"
    - "server/utils/scoring.js — nový calculateScore s pevnou tabulkou"
---

# Plan 6.1: TDD Rewrite — Scoring Engine

<objective>
Přepsat calculateScore() dle nové bodovací tabulky pomocí TDD přístupu.
Stará logika používala progresivní násobení (baseScore * 2^(count-3)), nová má pevné hodnoty.

Purpose: Správné bodování je základ celé hry — musí být 100% testované.
Output: Nové server/utils/scoring.js + kompletní test suite.
</objective>

<context>
Load for context:
- server/utils/scoring.js (stávající implementace — přepsat)
- server/tests/test-scoring.js (stávající testy — rozšířit)
</context>

<tasks>

## Red Phase

<task type="auto">
  <name>Napsat failing testy pro novou bodovací tabulku</name>
  <files>server/tests/test-scoring.js</files>
  <action>
    Přepsat test-scoring.js s kompletní sadou testů pokrývající NOVÁ pravidla:

    BODOVACÍ TABULKA (pevné hodnoty):
    - 1x jednička = 100b,  2x jednička = 200b
    - 3x jednička = 1000b, 4x = 2000b, 5x = 3000b, 6x = 4000b
    - 3x dvojka = 200b,    4x = 400b,  5x = 600b,  6x = 800b
    - 3x trojka = 300b,    4x = 600b,  5x = 900b,  6x = 1200b
    - 3x čtverka = 400b,   4x = 800b,  5x = 1200b, 6x = 1600b
    - 1x pětka = 50b,      2x pětka = 100b
    - 3x pětka = 500b,     4x = 1000b, 5x = 1500b, 6x = 2000b
    - 3x šestka = 600b,    4x = 1200b, 5x = 1800b, 6x = 2400b
    - Postupka (1,2,3,4,5,6) = 2000b
    - Tři páry (např. 2,2,3,3,5,5) = 700b

    Testovací případy (minimum):
    1. [1] → 100b
    2. [1,1] → 200b
    3. [1,1,1] → 1000b
    4. [1,1,1,1] → 2000b
    5. [1,1,1,1,1] → 3000b
    6. [1,1,1,1,1,1] → 4000b
    7. [5] → 50b
    8. [5,5] → 100b
    9. [5,5,5] → 500b
    10. [5,5,5,5] → 1000b
    11. [5,5,5,5,5] → 1500b
    12. [5,5,5,5,5,5] → 2000b
    13. [2,2,2] → 200b
    14. [2,2,2,2] → 400b
    15. [3,3,3] → 300b
    16. [4,4,4] → 400b
    17. [6,6,6] → 600b
    18. [6,6,6,6] → 1200b
    19. [6,6,6,6,6,6] → 2400b
    20. [1,2,3,4,5,6] → 2000b (postupka)
    21. [2,2,3,3,5,5] → 700b (tři páry)
    22. [1,1,2,2,3,3] → 700b (tři páry)
    23. [1,5,2,3,4,6] → 150b (1+5 osamocené)
    24. [2,3,4,6,2,3] → 0b (zelenáč)
    25. [1,1,1,5] → 1050b (trojice jedniček + osamocená pětka)
    26. [1,1,1,1,5] → 2050b (4x jednička + pětka)
    27. [2,2,2,1,5] → 350b (trojice dvojek + 1 + 5)

    AVOID: Testovat staré progresivní násobení — tabulka je pevná, ne násobená.

    Spustit `node --experimental-vm-modules server/tests/test-scoring.js` — VŠECHNY MUSÍ SELHAT (RED).
  </action>
  <verify>node --experimental-vm-modules server/tests/test-scoring.js → výstup obsahuje FAIL</verify>
  <done>Testy jsou napsány dle nové tabulky a selžou na stari implementaci.</done>
</task>

## Green Phase

<task type="auto">
  <name>Přepsat calculateScore() na pevnou bodovací tabulku</name>
  <files>server/utils/scoring.js</files>
  <action>
    Kompletně přepsat calculateScore() function.

    ALGORITMUS:
    1. Detekovat velkou postupku (6 různých hodnot 1-6) → 2000b, vrátit ihned.
    2. Detekovat tři páry (každá hodnota se vyskytuje přesně 2x) → 700b, vrátit ihned.
    3. Pro každou hodnotu 1-6 spočítat výskyt (count).
    4. Pokud count >= 3: vyhledat v SCORE_TABLE[val][count] pevnou hodnotu, označit VŠECHNY kostky dané hodnoty jako usedIndexes.
    5. Pokud count < 3 a val === 1: přidat count * 100, označit kostky.
    6. Pokud count < 3 a val === 5: přidat count * 50, označit kostky.
    7. Ostatní (2,3,4,6) s count < 3: nevyužité, ignorovat.

    SCORE_TABLE (objekt):
    ```
    const SCORE_TABLE = {
      1: { 3: 1000, 4: 2000, 5: 3000, 6: 4000 },
      2: { 3: 200,  4: 400,  5: 600,  6: 800  },
      3: { 3: 300,  4: 600,  5: 900,  6: 1200 },
      4: { 3: 400,  4: 800,  5: 1200, 6: 1600 },
      5: { 3: 500,  4: 1000, 5: 1500, 6: 2000 },
      6: { 3: 600,  4: 1200, 5: 1800, 6: 2400 },
    };
    ```

    AVOID: Nepoužívat Math.pow() ani progresivní násobení — tabulka je autoritativní zdroj.
    AVOID: Neměnit signaturu funkce — stále exportovat `calculateScore(dice)` vracející `{ score, usedIndexes }`.
  </action>
  <verify>node --experimental-vm-modules server/tests/test-scoring.js → všechny testy GREEN</verify>
  <done>Všechny testy procházejí, scoring odpovídá specifikaci.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `node --experimental-vm-modules server/tests/test-scoring.js` → 27/27 (nebo počet testů) PASS
- [ ] Zvláštní test: [1,1,1,1,5] → 2050b (ne 2000 z progresivního násobení)
- [ ] Zvláštní test: [6,6,6,6,6,6] → 2400b (ne 4800b ze starého vzorce 600 * 8)
</verification>

<success_criteria>
- [ ] Všechny testy zelené
- [ ] Stará logika Math.pow() odstraněna
- [ ] SCORE_TABLE je definována jako konstanta (čitelnost > výkon)
</success_criteria>

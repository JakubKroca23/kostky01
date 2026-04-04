/**
 * Pevná bodovací tabulka dle Phase 6 specifikace.
 * Formát: { hodnota: { počet: body } }
 */
const SCORE_TABLE = {
  1: { 3: 1000, 4: 2000, 5: 3000, 6: 4000 },
  2: { 3: 200,  4: 400,  5: 600,  6: 800  },
  3: { 3: 300,  4: 600,  5: 900,  6: 1200 },
  4: { 3: 400,  4: 800,  5: 1200, 6: 1600 },
  5: { 3: 500,  4: 1000, 5: 1500, 6: 2000 },
  6: { 3: 600,  4: 1200, 5: 1800, 6: 2400 },
};

/**
 * Vypočítá skóre pro zadané kostky podle pravidel 10 000 (Phase 6).
 * @param {number[]} dice - Pole s hodnotami kostek (1-6).
 * @returns {{ score: number, usedIndexes: number[] }} Výsledek bodování.
 */
export function calculateScore(dice) {
  if (!dice || dice.length === 0) return { score: 0, usedIndexes: [] };

  const counts = {};
  dice.forEach((val) => {
    counts[val] = (counts[val] || 0) + 1;
  });

  let totalScore = 0;
  let usedIndexes = new Set();

  const markUsed = (val, countToMark) => {
    let marked = 0;
    dice.forEach((v, i) => {
      if (v === val && marked < countToMark && !usedIndexes.has(i)) {
        usedIndexes.add(i);
        marked++;
      }
    });
  };

  // 1. Speciální kombinace: Velká postupka (1-6) = 2000b
  if (Object.keys(counts).length === 6 && dice.length === 6) {
    return { score: 2000, usedIndexes: [0, 1, 2, 3, 4, 5] };
  }

  // 2. Speciální kombinace: Tři dvojice = 700b
  const pairs = Object.entries(counts).filter(([, count]) => count === 2);
  if (pairs.length === 3 && dice.length === 6) {
    return { score: 700, usedIndexes: [0, 1, 2, 3, 4, 5] };
  }

  // 3. Počítání násobků (3+ stejných) a osamocených 1 a 5
  for (let val = 1; val <= 6; val++) {
    const num = Number(val);
    const count = counts[num] || 0;

    if (count >= 3) {
      // Body z pevné tabulky
      totalScore += SCORE_TABLE[num][count];
      markUsed(num, count);
    } else {
      // Kostky s méně než 3 výskyty
      if (num === 1) {
        totalScore += count * 100;
        markUsed(num, count);
      } else if (num === 5) {
        totalScore += count * 50;
        markUsed(num, count);
      }
    }
  }

  return {
    score: totalScore,
    usedIndexes: Array.from(usedIndexes)
  };
}

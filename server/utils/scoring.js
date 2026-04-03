/**
 * Vypočítá skóre pro zadané kostky podle pravidel 10 000.
 * @param {number[]} dice - Pole s hodnotami kostek (1-6).
 * @returns {{ score: number, usedIndexes: number[] }} Výsledek bodování.
 */
export function calculateScore(dice) {
  if (!dice || dice.length === 0) return { score: 0, usedIndexes: [] };

  const counts = {};
  dice.forEach((val, index) => {
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
  if (Object.keys(counts).length === 6) {
    return { score: 2000, usedIndexes: [0, 1, 2, 3, 4, 5] };
  }

  // 2. Speciální kombinace: Tři dvojice = 700b
  const pairs = Object.entries(counts).filter(([val, count]) => count >= 2);
  if (pairs.length === 3) {
      // Pokud máme přesně 3 dvojice (každá kostka je v páru)
      const allDiceArePairs = Object.values(counts).every(c => c === 2);
      if (allDiceArePairs) {
          return { score: 700, usedIndexes: [0, 1, 2, 3, 4, 5] };
      }
  }

  // 3. Počítání násobků (3+ stejných)
  for (let val = 1; val <= 6; val++) {
    const num = Number(val);
    const count = counts[num] || 0;

    if (count >= 3) {
      let baseScore = num === 1 ? 1000 : num * 100;
      // Progresivní násobení x2 pro každou kostku nad 3
      let multiplier = Math.pow(2, count - 3);
      totalScore += baseScore * multiplier;
      markUsed(num, count);
      counts[num] = 0; // Kostky byly "vyčerpány" kombinací
    }
  }

  // 4. Počítání osamocených 1 a 5
  if (counts[1] > 0) {
    totalScore += counts[1] * 100;
    markUsed(1, counts[1]);
  }
  if (counts[5] > 0) {
    totalScore += counts[5] * 50;
    markUsed(5, counts[5]);
  }

  return {
    score: totalScore,
    usedIndexes: Array.from(usedIndexes)
  };
}

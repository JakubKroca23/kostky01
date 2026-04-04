/**
 * Unified Scoring Engine for "10 000" (Server Copy)
 * Handles fixed scoring table, special combinations, and first-roll-only restrictions.
 */

const SCORING_FIXED_TABLE = {
  // val: { count: score }
  1: { 3: 1000, 4: 2000, 5: 3000, 6: 4000 },
  2: { 3: 200,  4: 400,  5: 600,  6: 800  },
  3: { 3: 300,  4: 600,  5: 900,  6: 1200 },
  4: { 3: 400,  4: 800,  5: 1200, 6: 1600 },
  5: { 3: 500,  4: 1000, 5: 1500, 6: 2000 },
  6: { 3: 600,  4: 1200, 5: 1800, 6: 2400 },
};

/**
 * Calculates score for a given set of dice.
 * @param {number[]} dice - Array of dice values (1-6).
 * @param {boolean} isFirstRoll - Whether this is the first roll of a turn.
 * @returns {{ score: number, usedIndexes: number[], canDohodit: boolean }} Result.
 */
export function calculateScore(dice, isFirstRoll = false) {
  if (!dice || dice.length === 0) return { score: 0, usedIndexes: [], canDohodit: false };

  const counts = {};
  dice.forEach((val) => {
    counts[val] = (counts[val] || 0) + 1;
  });

  let totalScore = 0;
  let usedIndexes = new Set();
  let canDohodit = false;

  const markUsed = (val, countToMark) => {
    let marked = 0;
    dice.forEach((v, i) => {
      if (v === val && marked < countToMark && !usedIndexes.has(i)) {
        usedIndexes.add(i);
        marked++;
      }
    });
  };

  // 1. COMBINATIONS (STRAIGHT, PAIRS) - AVAILABLE WHENEVER 6 DICE ARE ROLLED
  if (dice.length === 6) {
    // 1A. Straight 1-2-3-4-5-6 = 2000b
    if (Object.keys(counts).length === 6) {
       return { score: 2000, usedIndexes: [0, 1, 2, 3, 4, 5], canDohodit: false };
    }

    // 1B. Three pairs (e.g. 2,2,4,4,6,6) = 700b
    const pairs = Object.entries(counts).filter(([, count]) => count === 2);
    if (pairs.length === 3) {
      return { score: 700, usedIndexes: [0, 1, 2, 3, 4, 5], canDohodit: false };
    }
  }

  // 2. MULTIPLES (3+ of same)
  for (let val = 1; val <= 6; val++) {
    const num = Number(val);
    const count = counts[num] || 0;

    if (count >= 3) {
      totalScore += SCORING_FIXED_TABLE[num][count];
      markUsed(num, count);
      counts[num] = 0; // Prevent lone 1s/5s from using these dice
    }
  }

  // 3. LONE ONES AND FIVES (1, 2 items)
  if (counts[1] > 0) {
    totalScore += counts[1] * 100;
    markUsed(1, counts[1]);
  }
  if (counts[5] > 0) {
    totalScore += counts[5] * 50;
    markUsed(5, counts[5]);
  }

  // 1C. Check for "Dohodit" (5/6 pieces) - ONLY ON FIRST ROLL
  if (isFirstRoll && dice.length === 6) {
    if (Object.keys(counts).length === 5 && Object.values(counts).every(v => v <= 2)) {
      canDohodit = true; 
    }
    const pairsCount = Object.values(counts).filter(c => c === 2).length;
    if (pairsCount === 2 && Object.values(counts).filter(c => c === 1).length === 2) {
      canDohodit = true; 
    }
  }

  return {
    score: totalScore,
    usedIndexes: Array.from(usedIndexes),
    canDohodit: canDohodit // Logic for Plan 6.3
  };
}

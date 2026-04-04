import { calculateScore } from '../utils/scoring.js';

const tests = [
  { dice: [1, 2, 3, 4, 5, 6], expected: 2000, first: true, name: 'Velká postupka (1. hod)' },
  { dice: [1, 2, 3, 4, 5, 6], expected: 150,  first: false, name: 'Velká postupka (ne 1. hod) -> jen 1+5' },
  { dice: [1, 1, 2, 2, 3, 3], expected: 700,  first: true, name: 'Tři dvojice (1. hod)' },
  { dice: [1, 1, 2, 2, 3, 3], expected: 200,  first: false, name: 'Tři dvojice (ne 1. hod) -> jen 1+1' },
  { dice: [2, 2, 2, 3, 4, 6], expected: 200,  first: false, name: 'Trojice dvojek' },
  { dice: [1, 1, 1, 1, 1, 1], expected: 4000, first: false, name: 'Šestice jedniček (Fixní tabulka)' },
  { dice: [5, 5, 5, 5, 5, 5], expected: 2000, first: false, name: 'Šestice pětek (Fixní tabulka)' },
  { dice: [1, 5, 2, 2, 3, 4], expected: 150,  first: false, name: 'Jednotlivé 1 a 5' },
  { dice: [2, 3, 4, 6, 2, 3], expected: 0,    first: false, name: 'Zelenáč (Bust)' },
  { dice: [1, 1, 1, 2, 2, 2], expected: 1200, first: false, name: 'Dvě trojice (1000 + 200)' },
  { dice: [1, 1, 1, 1],       expected: 2000, first: false, name: 'Čtveřice jedniček' },
];

console.log('--- STARTING SCORING TESTS (Plan 6.1) ---');
let passed = 0;

tests.forEach((t) => {
  const result = calculateScore(t.dice, t.first);
  if (result.score === t.expected) {
    console.log(`✅ [PASS] ${t.name} -> ${result.score}b (Match!)`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${t.name} -> Expected ${t.expected}b, got ${result.score}b`);
  }
});

console.log(`\nResult: ${passed}/${tests.length} passed.`);
if (passed === tests.length) {
    console.log("🚀 All tests passed! Scoring engine is synced with User Manual.");
    process.exit(0);
} else {
    process.exit(1);
}

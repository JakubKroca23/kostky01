import { calculateScore } from '../utils/scoring.js';

const tests = [
  { dice: [1, 2, 3, 4, 5, 6], expected: 2000, name: 'Velká postupka' },
  { dice: [1, 1, 2, 2, 3, 3], expected: 700, name: 'Tři dvojice' },
  { dice: [2, 2, 2, 3, 4, 6], expected: 200, name: 'Trojice dvojek' },
  { dice: [1, 1, 1, 1, 1, 1], expected: 8000, name: 'Šestice jedniček' },
  { dice: [5, 5, 5, 5, 5, 5], expected: 4000, name: 'Šestice pětek' },
  { dice: [1, 5, 2, 2, 3, 4], expected: 150, name: 'Jednotlivé 1 a 5' },
  { dice: [2, 3, 4, 6, 2, 3], expected: 0, name: 'Zelenáč (Bust)' },
  { dice: [1, 1, 1, 2, 2, 2], expected: 1200, name: 'Dvě trojice (1000 + 200)' },
];

console.log('--- STARTING SCORING TESTS ---');
let passed = 0;

tests.forEach((t) => {
  const result = calculateScore(t.dice);
  if (result.score === t.expected) {
    console.log(`✅ [PASS] ${t.name} -> ${result.score}b`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${t.name} -> Expected ${t.expected}b, got ${result.score}b`);
  }
});

console.log(`\nResult: ${passed}/${tests.length} passed.`);
if (passed === tests.length) process.exit(0);
else process.exit(1);

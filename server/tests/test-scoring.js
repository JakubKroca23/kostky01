import { calculateScore } from '../utils/scoring.js';

const tests = [
  { dice: [1], expected: 100, name: '1x jednička' },
  { dice: [1, 1], expected: 200, name: '2x jednička' },
  { dice: [1, 1, 1], expected: 1000, name: '3x jednička' },
  { dice: [1, 1, 1, 1], expected: 2000, name: '4x jednička' },
  { dice: [1, 1, 1, 1, 1], expected: 3000, name: '5x jednička' },
  { dice: [1, 1, 1, 1, 1, 1], expected: 4000, name: '6x jednička' },
  { dice: [5], expected: 50, name: '1x pětka' },
  { dice: [5, 5], expected: 100, name: '2x pětka' },
  { dice: [5, 5, 5], expected: 500, name: '3x pětka' },
  { dice: [5, 5, 5, 5], expected: 1000, name: '4x pětka' },
  { dice: [5, 5, 5, 5, 5], expected: 1500, name: '5x pětka' },
  { dice: [5, 5, 5, 5, 5, 5], expected: 2000, name: '6x pětka' },
  { dice: [2, 2, 2], expected: 200, name: '3x dvojka' },
  { dice: [2, 2, 2, 2], expected: 400, name: '4x dvojka' },
  { dice: [3, 3, 3], expected: 300, name: '3x trojka' },
  { dice: [4, 4, 4], expected: 400, name: '3x čtverka' },
  { dice: [6, 6, 6], expected: 600, name: '3x šestka' },
  { dice: [6, 6, 6, 6], expected: 1200, name: '4x šestka' },
  { dice: [6, 6, 6, 6, 6, 6], expected: 2400, name: '6x šestka' },
  { dice: [1, 2, 3, 4, 5, 6], expected: 2000, name: 'Velká postupka' },
  { dice: [2, 2, 3, 3, 5, 5], expected: 700, name: 'Tři páry (2,3,5)' },
  { dice: [1, 1, 2, 2, 3, 3], expected: 700, name: 'Tři páry (1,2,3)' },
  { dice: [1, 5, 2, 2, 3, 4], expected: 150, name: 'Jednotlivé 1 a 5' },
  { dice: [2, 3, 4, 6, 2, 3], expected: 0, name: 'Zelenáč (Bust)' },
  { dice: [1, 1, 1, 5], expected: 1050, name: '3x jednička + pětka' },
  { dice: [1, 1, 1, 1, 5], expected: 2050, name: '4x jednička + pětka' },
  { dice: [2, 2, 2, 1, 5], expected: 350, name: '3x dvojka + 1 + 5' },
];

console.log('--- STARTING NEW SCORING TESTS (Plan 6.1) ---');
let passed = 0;
let failed = 0;

tests.forEach((t) => {
  const result = calculateScore(t.dice);
  if (result.score === t.expected) {
    console.log(`✅ [PASS] ${t.name} -> ${result.score}b`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${t.name} -> Expected ${t.expected}b, got ${result.score}b`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed === 0) process.exit(0);
else process.exit(1);

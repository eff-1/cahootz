import test from 'node:test';
import assert from 'node:assert';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  SESSION_DEFAULTS,
  COMPLETION,
  RELIABILITY_BANDS,
  DISPUTES,
  AGE,
  SESSION_STATES,
} from '../src/constants/index.ts';

test('Brand constants are defined and single source of truth', () => {
  assert.strictEqual(BRAND_NAME, 'Cahootz');
  assert.strictEqual(BRAND_TAGLINE, 'Learn together. Go further.');
});

test('Completion criteria match execution prompt decisions (D-012)', () => {
  // D-012: 70% connected time threshold
  assert.strictEqual(COMPLETION.FULL_COMPLETION_THRESHOLD, 0.7);
  assert.strictEqual(COMPLETION.PARTIAL_COMPLETION_THRESHOLD, 0.5);
  assert.strictEqual(COMPLETION.MAX_CONNECTED_MISSED_PINGS, 1);
});

test('Reliability bands match execution prompt decisions (D-014: 4 bands)', () => {
  assert.strictEqual(RELIABILITY_BANDS.NEW, 'New');
  assert.strictEqual(RELIABILITY_BANDS.BUILDING, 'Building');
  assert.strictEqual(RELIABILITY_BANDS.RELIABLE, 'Reliable');
  assert.strictEqual(RELIABILITY_BANDS.VERY_RELIABLE, 'Very Reliable');
});

test('Dispute window matches execution prompt decisions (D-013: 24h)', () => {
  assert.strictEqual(DISPUTES.DISPUTE_WINDOW_HOURS, 24);
});

test('Minimum age and restricted mode boundaries (OPEN-06)', () => {
  assert.strictEqual(AGE.MINIMUM_AGE, 16);
  assert.strictEqual(AGE.RESTRICTED_AGE_THRESHOLD, 18);
});

test('Session lifecycle states match FEATURE_SPECIFICATIONS 7.2 state table', () => {
  const expectedStates = [
    'CREATED',
    'INVITED',
    'SCHEDULED',
    'READY',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'CANCELLED',
    'EXPIRED',
    'ABANDONED',
    'DISPUTED',
  ];
  for (const state of expectedStates) {
    assert.ok(state in SESSION_STATES, `State ${state} should exist in SESSION_STATES`);
  }
});

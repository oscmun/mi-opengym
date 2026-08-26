import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidReps, isValidSets, isValidWeight, validateWorkoutState } from './validation.js';

describe('isValidReps', () => {
  it('accepts 0 and positive integers', () => {
    assert.equal(isValidReps(0), true);
    assert.equal(isValidReps(1), true);
    assert.equal(isValidReps(10), true);
  });

  it('rejects negative values', () => {
    assert.equal(isValidReps(-1), false);
    assert.equal(isValidReps(-10), false);
  });

  it('rejects decimals', () => {
    assert.equal(isValidReps(0.5), false);
    assert.equal(isValidReps(2.5), false);
  });

  it('rejects NaN, Infinity, and non-numbers', () => {
    assert.equal(isValidReps(NaN), false);
    assert.equal(isValidReps(Infinity), false);
    assert.equal(isValidReps(-Infinity), false);
    assert.equal(isValidReps('5'), false);
    assert.equal(isValidReps(null), false);
    assert.equal(isValidReps(undefined), false);
  });
});

describe('isValidSets', () => {
  it('accepts 0 and positive integers', () => {
    assert.equal(isValidSets(0), true);
    assert.equal(isValidSets(3), true);
  });

  it('rejects negative values', () => {
    assert.equal(isValidSets(-1), false);
  });

  it('rejects decimals', () => {
    assert.equal(isValidSets(3.5), false);
  });

  it('rejects NaN, Infinity, and non-numbers', () => {
    assert.equal(isValidSets(NaN), false);
    assert.equal(isValidSets(Infinity), false);
    assert.equal(isValidSets('3'), false);
    assert.equal(isValidSets(null), false);
  });
});

describe('isValidWeight', () => {
  it('accepts 0, positive integers, and positive decimals', () => {
    assert.equal(isValidWeight(0), true);
    assert.equal(isValidWeight(50), true);
    assert.equal(isValidWeight(2.5), true);
    assert.equal(isValidWeight(62.5), true);
  });

  it('rejects negative values', () => {
    assert.equal(isValidWeight(-1), false);
    assert.equal(isValidWeight(-2.5), false);
  });

  it('rejects NaN, Infinity, and non-numbers', () => {
    assert.equal(isValidWeight(NaN), false);
    assert.equal(isValidWeight(Infinity), false);
    assert.equal(isValidWeight('20'), false);
    assert.equal(isValidWeight(null), false);
  });
});

describe('validateWorkoutState', () => {
  it('accepts valid workout state with routines, workouts, exWeights', () => {
    const state = {
      routines: [
        {
          id: 'r1',
          ex: [
            { id: 'bench', sets: 3, reps: 10, repsMin: 8, repsMax: 12, weight: 80 }
          ]
        }
      ],
      workouts: [
        {
          id: 'w1',
          entries: [
            {
              id: 'bench',
              topW: 80,
              target: { sets: 3, reps: 10, repsMin: 8, repsMax: 12, weight: 80 },
              sets: [
                { w: 80, r: 10, done: true },
                { w: 80, r: 8, done: true }
              ]
            }
          ]
        }
      ],
      exWeights: {
        bench: { w: 80, d: '2026-08-25' }
      }
    };
    assert.equal(validateWorkoutState(state), true);
  });

  it('rejects invalid reps in workout sets', () => {
    const state = {
      workouts: [{ entries: [{ sets: [{ w: 50, r: -1 }] }] }]
    };
    assert.equal(validateWorkoutState(state), false);
  });

  it('rejects invalid weight in workout sets', () => {
    const state = {
      workouts: [{ entries: [{ sets: [{ w: -50, r: 10 }] }] }]
    };
    assert.equal(validateWorkoutState(state), false);
  });

  it('rejects invalid sets count in routine exercise', () => {
    const state = {
      routines: [{ ex: [{ sets: -3 }] }]
    };
    assert.equal(validateWorkoutState(state), false);
  });

  it('rejects invalid weight in exWeights', () => {
    const state = {
      exWeights: { bench: { w: -80 } }
    };
    assert.equal(validateWorkoutState(state), false);
  });

  it('rejects null or non-object state', () => {
    assert.equal(validateWorkoutState(null), false);
    assert.equal(validateWorkoutState(undefined), false);
    assert.equal(validateWorkoutState('string'), false);
  });
});

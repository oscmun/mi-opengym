import { describe, it, expect } from 'vitest'
import { isValidReps, isValidSets, isValidWeight, validateWorkoutState } from './validation.js'

describe('isValidReps', () => {
  it('accepts 0', () => {
    expect(isValidReps(0)).toBe(true)
  })

  it('accepts positive integers', () => {
    expect(isValidReps(1)).toBe(true)
    expect(isValidReps(5)).toBe(true)
    expect(isValidReps(10)).toBe(true)
    expect(isValidReps(100)).toBe(true)
  })

  it('rejects negative values', () => {
    expect(isValidReps(-1)).toBe(false)
    expect(isValidReps(-5)).toBe(false)
    expect(isValidReps(-100)).toBe(false)
  })

  it('rejects decimal values', () => {
    expect(isValidReps(0.5)).toBe(false)
    expect(isValidReps(3.5)).toBe(false)
    expect(isValidReps(10.1)).toBe(false)
  })

  it('rejects NaN, Infinity, -Infinity', () => {
    expect(isValidReps(NaN)).toBe(false)
    expect(isValidReps(Infinity)).toBe(false)
    expect(isValidReps(-Infinity)).toBe(false)
  })

  it('rejects non-numeric types', () => {
    expect(isValidReps('10')).toBe(false)
    expect(isValidReps('0')).toBe(false)
    expect(isValidReps(null)).toBe(false)
    expect(isValidReps(undefined)).toBe(false)
    expect(isValidReps({})).toBe(false)
    expect(isValidReps([])).toBe(false)
    expect(isValidReps(true)).toBe(false)
  })
})

describe('isValidSets', () => {
  it('accepts 0', () => {
    expect(isValidSets(0)).toBe(true)
  })

  it('accepts positive integers', () => {
    expect(isValidSets(1)).toBe(true)
    expect(isValidSets(3)).toBe(true)
    expect(isValidSets(5)).toBe(true)
  })

  it('rejects negative values', () => {
    expect(isValidSets(-1)).toBe(false)
    expect(isValidSets(-3)).toBe(false)
  })

  it('rejects decimal values', () => {
    expect(isValidSets(2.5)).toBe(false)
    expect(isValidSets(0.1)).toBe(false)
  })

  it('rejects NaN, Infinity, and non-numeric types', () => {
    expect(isValidSets(NaN)).toBe(false)
    expect(isValidSets(Infinity)).toBe(false)
    expect(isValidSets(-Infinity)).toBe(false)
    expect(isValidSets('3')).toBe(false)
    expect(isValidSets(null)).toBe(false)
    expect(isValidSets(undefined)).toBe(false)
  })
})

describe('isValidWeight', () => {
  it('accepts 0', () => {
    expect(isValidWeight(0)).toBe(true)
  })

  it('accepts positive integers', () => {
    expect(isValidWeight(20)).toBe(true)
    expect(isValidWeight(100)).toBe(true)
  })

  it('accepts positive decimal values', () => {
    expect(isValidWeight(2.5)).toBe(true)
    expect(isValidWeight(62.5)).toBe(true)
    expect(isValidWeight(0.25)).toBe(true)
  })

  it('rejects negative numbers and negative decimals', () => {
    expect(isValidWeight(-1)).toBe(false)
    expect(isValidWeight(-2.5)).toBe(false)
    expect(isValidWeight(-0.1)).toBe(false)
  })

  it('rejects NaN, Infinity, -Infinity', () => {
    expect(isValidWeight(NaN)).toBe(false)
    expect(isValidWeight(Infinity)).toBe(false)
    expect(isValidWeight(-Infinity)).toBe(false)
  })

  it('rejects non-numeric types', () => {
    expect(isValidWeight('20')).toBe(false)
    expect(isValidWeight('2.5')).toBe(false)
    expect(isValidWeight(null)).toBe(false)
    expect(isValidWeight(undefined)).toBe(false)
    expect(isValidWeight({})).toBe(false)
  })
})

describe('validateWorkoutState', () => {
  it('accepts valid state object', () => {
    const state = {
      routines: [
        {
          id: 'r1',
          name: 'Push',
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
      active: {
        id: 'w2',
        entries: [
          {
            id: 'squat',
            topW: 100,
            sets: [
              { w: 100, r: 5, done: false }
            ]
          }
        ]
      },
      exWeights: {
        bench: { w: 80, d: '2026-08-25' },
        squat: 100
      }
    }
    expect(validateWorkoutState(state)).toBe(true)
  })

  it('rejects negative reps in workout sets', () => {
    const state = {
      workouts: [
        {
          entries: [
            {
              sets: [{ w: 50, r: -5 }]
            }
          ]
        }
      ]
    }
    expect(validateWorkoutState(state)).toBe(false)
  })

  it('rejects decimal reps in workout sets', () => {
    const state = {
      workouts: [
        {
          entries: [
            {
              sets: [{ w: 50, r: 8.5 }]
            }
          ]
        }
      ]
    }
    expect(validateWorkoutState(state)).toBe(false)
  })

  it('rejects negative weight in workout sets', () => {
    const state = {
      workouts: [
        {
          entries: [
            {
              sets: [{ w: -10, r: 5 }]
            }
          ]
        }
      ]
    }
    expect(validateWorkoutState(state)).toBe(false)
  })

  it('rejects negative or decimal sets count in routine exercise', () => {
    expect(validateWorkoutState({
      routines: [{ ex: [{ sets: -1 }] }]
    })).toBe(false)

    expect(validateWorkoutState({
      routines: [{ ex: [{ sets: 3.5 }] }]
    })).toBe(false)
  })

  it('rejects negative reps in routine exercise', () => {
    expect(validateWorkoutState({
      routines: [{ ex: [{ reps: -5 }] }]
    })).toBe(false)

    expect(validateWorkoutState({
      routines: [{ ex: [{ repsMin: -2 }] }]
    })).toBe(false)

    expect(validateWorkoutState({
      routines: [{ ex: [{ repsMax: -8 }] }]
    })).toBe(false)
  })

  it('rejects negative weight in routine exercise', () => {
    expect(validateWorkoutState({
      routines: [{ ex: [{ weight: -20 }] }]
    })).toBe(false)
  })

  it('rejects NaN or negative in topW', () => {
    expect(validateWorkoutState({
      workouts: [{ entries: [{ topW: NaN }] }]
    })).toBe(false)

    expect(validateWorkoutState({
      workouts: [{ entries: [{ topW: -5 }] }]
    })).toBe(false)
  })

  it('rejects negative weight in exWeights', () => {
    expect(validateWorkoutState({
      exWeights: { bench: { w: -50 } }
    })).toBe(false)

    expect(validateWorkoutState({
      exWeights: { bench: -50 }
    })).toBe(false)
  })

  it('rejects non-object or null state', () => {
    expect(validateWorkoutState(null)).toBe(false)
    expect(validateWorkoutState(undefined)).toBe(false)
    expect(validateWorkoutState('string')).toBe(false)
    expect(validateWorkoutState(123)).toBe(false)
  })
})

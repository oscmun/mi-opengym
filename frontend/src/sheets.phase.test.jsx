// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const state = { S: null, stopRest: vi.fn(), nav: vi.fn() }
  state.store = () => ({
    S: state.S,
    update: mutator => mutator(state.S),
  })
  return state
})

vi.mock('./store/useStore.js', () => {
  const useStore = selector => selector(mocks.store())
  useStore.getState = mocks.store
  return { useStore }
})
vi.mock('./store/useUI.js', () => {
  const snapshot = () => ({ stopRest: mocks.stopRest })
  const useUI = selector => selector ? selector(snapshot()) : snapshot()
  useUI.getState = snapshot
  return { useUI }
})
vi.mock('./lib/nav.js', () => ({ nav: mocks.nav }))

import { beginWorkout } from './sheets.jsx'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.S = {
    unit: 'kg', workouts: [], exWeights: {}, active: null,
    routines: [{
      id: 'phase-routine', name: 'Phase routine',
      ex: [{
        id: 'phase-lift', mode: 'reps', sets: 1, reps: 5, weight: 100,
        phases: ['warm-up', 'work'],
        warmup: [{ mode: 'reps', reps: 8, weight: 20, note: 'persist' }],
      }],
    }],
  }
})

describe('beginWorkout phase integration', () => {
  it('persists configured phase rows in the real active-session construction path', () => {
    beginWorkout('phase-routine', null)

    expect(mocks.S.active.entries[0].sets).toEqual([
      { note: 'persist', phase: 'warmup', mode: 'reps', done: false, w: 20, r: 8 },
      { phase: 'work', mode: 'reps', w: 100, r: 5, done: false },
    ])
    expect(mocks.S.active.entries[0].target.phases).toEqual(['warm-up', 'work'])
    expect(mocks.stopRest).toHaveBeenCalledOnce()
    expect(mocks.nav).toHaveBeenCalledWith('/workout')
  })

  it('does not create an empty workout for a warm-up-only routine without explicit targets', () => {
    const config = mocks.S.routines[0].ex[0]
    config.phases = ['warmup']
    delete config.warmup

    beginWorkout('phase-routine', null)

    expect(mocks.S.active.entries[0].sets).toEqual([
      { phase: 'warmup', mode: 'reps', w: 100, r: 5, done: false },
    ])
  })

  it('keeps the v1.2.11 planned warm-up ramp exactly once at routine start', () => {
    const config = mocks.S.routines[0].ex[0]
    delete config.warmup
    config.warmupSets = 3

    beginWorkout('phase-routine', null)

    const rows = mocks.S.active.entries[0].sets
    expect(rows.filter(row => row.phase === 'warmup').map(row => row.w)).toEqual([50, 75, 87.5])
    expect(rows.filter(row => row.phase === 'work').map(row => row.w)).toEqual([100])
    expect(rows.every(row => row.w > 0 && row.r > 0)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  hasSelectedWorkPhase, addSetForEntry, prependWarmupSets,
  warmupConfigForEntry, applyWarmupConfigToEntry,
} from './workout-runtime.js'

describe('phase-aware active workout helpers', () => {
  it('builds trainable warm-up rows when warm-up is the only selected phase', () => {
    expect(prependWarmupSets({
      phases: ['warmup'], mode: 'reps', sets: 3, reps: 8, weight: 20,
    }, [
      { w: 20, r: 8, done: false },
      { w: 20, r: 8, done: false },
      { w: 20, r: 8, done: false },
    ])).toEqual([
      { phase: 'warmup', mode: 'reps', w: 20, r: 8, done: false },
      { phase: 'warmup', mode: 'reps', w: 20, r: 8, done: false },
      { phase: 'warmup', mode: 'reps', w: 20, r: 8, done: false },
    ])
  })

  it('treats omitted phase selection as work-capable and respects warm-up-only targets', () => {
    expect(hasSelectedWorkPhase({})).toBe(true)
    expect(hasSelectedWorkPhase({ phases: ['warm-up'] })).toBe(false)
    expect(hasSelectedWorkPhase({ target: { phases: ['warmup', 'work'] } })).toBe(true)
  })

  it('adds a canonical row without crossing a warm-up-only boundary', () => {
    const warmupOnly = {
      target: { phases: ['warm_up'], mode: 'reps', reps: 8, weight: 20 },
      sets: [
        { phase: 'warmup', w: 15, r: 10, done: true },
        { phase: 'work', w: 60, r: 5, done: true },
      ],
    }
    expect(addSetForEntry(warmupOnly)).toEqual({ phase: 'warmup', w: 15, r: 10, done: false })

    const mixed = {
      target: { mode: 'time', sec: 45, weight: 10 },
      sets: [{ phase: 'warmup', sec: 20, w: 5, done: true }],
    }
    expect(addSetForEntry(mixed)).toEqual({ phase: 'work', mode: 'time', sec: 45, w: 10, done: false })

    const workWithMetadata = {
      target: { mode: 'reps', reps: 5 },
      sets: [{ phase: 'work', w: 100, r: 5, done: true, type: 'dropset', drops: [{ w: 80, r: 5 }], note: 'keep' }],
    }
    expect(addSetForEntry(workWithMetadata)).toEqual({
      phase: 'work', w: 100, r: 5, done: false,
      type: 'dropset', drops: [{ w: 80, r: 5 }], note: 'keep',
    })
  })

  it('prepends configured warm-ups and preserves current-main work-row fields', () => {
    const work = [{ w: 100, r: 5, done: false, type: 'dropset', drops: [{ w: 80, r: 5 }] }]
    const rows = prependWarmupSets({
      phases: ['warm-up', 'work'],
      warmup: [
        { mode: 'reps', reps: 8, weight: 20 },
        { mode: 'time', sec: 30, weight: 10, restSec: 45 },
      ],
    }, work)

    expect(rows).toEqual([
      { phase: 'warmup', mode: 'reps', w: 20, r: 8, done: false },
      { phase: 'warmup', mode: 'time', w: 10, sec: 30, done: false, restSec: 45 },
      { phase: 'work', mode: 'reps', w: 100, r: 5, done: false, type: 'dropset', drops: [{ w: 80, r: 5 }] },
    ])
  })

  it('keeps the authoritative planned ramp exactly once after progression or deload', () => {
    const progressed = [
      { phase: 'warmup', warmup: true, w: 25, r: 5, done: false },
      { phase: 'warmup', warmup: true, w: 37.5, r: 5, done: false },
      { w: 50, r: 5, done: false },
      { w: 50, r: 5, done: false },
    ]

    const rows = prependWarmupSets({
      phases: ['warmup', 'work'], warmupSets: 2, mode: 'reps', reps: 5, weight: 100,
      warmup: [{ mode: 'reps' }],
    }, progressed)

    expect(rows.filter(row => row.phase === 'warmup').map(row => row.w)).toEqual([25, 37.5])
    expect(rows.filter(row => row.phase === 'work').map(row => row.w)).toEqual([50, 50])
    expect(rows.every(row => row.w > 0 && row.r > 0)).toBe(true)
  })

  it('round-trips editor config and never rewrites completed warm-ups or work rows', () => {
    const entry = {
      id: 'bench',
      target: { mode: 'reps', reps: 5 },
      sets: [
        { warmup: true, w: 20, r: 8, done: true, note: 'immutable' },
        { phase: 'warmup', w: 30, r: 6, done: false },
        { phase: 'work', w: 100, r: 5, done: true, type: 'restpause', clusters: [{ r: 2 }] },
      ],
    }
    const config = warmupConfigForEntry(entry)
    expect(config.warmup).toEqual([
      { phase: 'warmup', mode: 'reps', reps: 8, weight: 20, note: 'immutable' },
      { phase: 'warmup', mode: 'reps', reps: 6, weight: 30 },
    ])

    const next = applyWarmupConfigToEntry(entry, {
      ...config,
      warmup: [
        { mode: 'reps', reps: 12, weight: 25 },
        { mode: 'reps', reps: 4, weight: 35 },
      ],
    })
    expect(next.sets[0]).toEqual({ warmup: true, phase: 'warmup', w: 20, r: 8, done: true, note: 'immutable' })
    expect(next.sets[1]).toEqual({ phase: 'warmup', mode: 'reps', w: 35, r: 4, done: false })
    expect(next.sets[2]).toBe(entry.sets[2])
    expect(entry.sets[1]).toEqual({ phase: 'warmup', w: 30, r: 6, done: false })
  })

  it('preserves completed rows and unknown metadata when an edit shrinks warm-ups', () => {
    const entry = {
      target: { mode: 'reps' },
      sets: [
        { phase: 'warmup', w: 10, r: 10, done: true, note: 'first' },
        { phase: 'warmup', w: 20, r: 8, done: true, type: 'dropset', drops: [{ w: 15, r: 4 }] },
        { phase: 'warmup', w: 30, r: 6, done: false, custom: { keep: true } },
        { phase: 'work', w: 100, r: 5, done: false },
      ],
    }

    const projected = warmupConfigForEntry(entry)
    expect(projected.warmup[1]).toMatchObject({ type: 'dropset', drops: [{ w: 15, r: 4 }] })
    expect(projected.warmup[2]).toMatchObject({ custom: { keep: true } })

    const next = applyWarmupConfigToEntry(entry, { mode: 'reps', warmup: [] })
    expect(next.sets).toEqual([
      { phase: 'warmup', w: 10, r: 10, done: true, note: 'first' },
      { phase: 'warmup', w: 20, r: 8, done: true, type: 'dropset', drops: [{ w: 15, r: 4 }] },
      { phase: 'work', w: 100, r: 5, done: false },
    ])
  })
})

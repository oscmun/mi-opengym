import {
  isWarmupOnlyTarget, modeForSet, normalizeMode, normalizePhaseList, phaseForSet,
} from './workout-model.js'

const objectOf = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** Whether the selected routine phases include work; an omitted selection keeps legacy behavior. */
export function hasSelectedWorkPhase(config = {}) {
  const source = objectOf(config)
  const target = objectOf(source.target)
  const phases = normalizePhaseList(source.phases ?? target.phases)
  return phases == null || phases.includes('work')
}

function modeForTarget(target = {}) {
  if (target.mode === 'cardio' || target.min != null || target.speed != null) return 'cardio'
  return normalizeMode(target.mode, target.sec != null ? 'time' : 'reps')
}

function rowForTarget(target = {}, phase = 'work') {
  const {
    phase: omittedPhase, warmup: omittedWarmup, mode: omittedMode, done: omittedDone,
    w: omittedW, weight: omittedWeight, r: omittedR, reps: omittedReps,
    sec: omittedSec, min: omittedMin, speed: omittedSpeed, restSec: omittedRest,
    ...metadata
  } = target
  const mode = modeForTarget(target)
  const base = {
    ...metadata,
    phase,
    ...(mode === 'cardio' ? {} : { mode }),
    done: false,
  }
  if (mode === 'cardio') {
    return { ...base, min: numberOr(target.min, 20), speed: numberOr(target.speed, 8) }
  }
  const weight = numberOr(target.w ?? target.weight, 0)
  const rest = target.restSec != null ? { restSec: numberOr(target.restSec, 0) } : {}
  if (mode === 'time') return { ...base, w: weight, sec: numberOr(target.sec, 45), ...rest }
  return { ...base, w: weight, r: numberOr(target.r ?? target.reps, 0), ...rest }
}

/** Build the next row without crossing an authoritative warm-up-only phase boundary. */
export function addSetForEntry(entry = {}) {
  const source = objectOf(entry)
  const target = objectOf(source.target || source)
  const sets = Array.isArray(source.sets) ? source.sets : []
  if (isWarmupOnlyTarget(target, source)) {
    const previous = [...sets].reverse().find(set => phaseForSet(set) === 'warmup')
    if (previous) return { ...previous, phase: 'warmup', done: false }
    const configured = Array.isArray(target.warmup) ? target.warmup.at(-1) : null
    return rowForTarget(configured || target, 'warmup')
  }

  const previous = [...sets].reverse().find(set => phaseForSet(set) === 'work')
  if (!previous) return rowForTarget(target, 'work')
  return { ...previous, phase: 'work', done: false }
}

function warmupTargets(config = {}) {
  return Array.isArray(config.warmup) ? config.warmup : []
}

/** Prepend explicit warm-ups while retaining every current-main row field and planned ramp. */
export function prependWarmupSets(config = {}, workSets = []) {
  const selected = normalizePhaseList(config.phases)
  const allows = phase => selected == null || selected.includes(phase)
  const currentSets = Array.isArray(workSets) ? workSets : []
  const plannedWarmups = warmupTargets(config)
  const hasExistingWarmups = currentSets.some(set => phaseForSet(set) === 'warmup')
  const fallbackWarmupSets = isWarmupOnlyTarget(config)
    && plannedWarmups.length === 0
    && !hasExistingWarmups
    ? currentSets
    : []
  const warmupSource = hasExistingWarmups
    ? []
    : (plannedWarmups.length ? plannedWarmups : fallbackWarmupSets)
  const warmups = warmupSource
    .map(target => fallbackWarmupSets.length
      ? { ...target, phase: 'warmup', mode: modeForSet(target, config) }
      : rowForTarget(target, 'warmup'))
    .filter(() => allows('warmup'))
  const work = currentSets
    .map(set => ({
      ...set,
      phase: phaseForSet(set),
      mode: modeForSet(set, config),
    }))
    .filter(set => allows(set.phase))
  return [...warmups, ...work]
}

/** Build an editor target from active warm-up rows, including manually added rows. */
export function warmupConfigForEntry(entry = {}) {
  const source = objectOf(entry)
  const target = objectOf(source.target)
  const warmup = (Array.isArray(source.sets) ? source.sets : [])
    .filter(set => phaseForSet(set) === 'warmup')
    .map(set => {
      const {
        phase: omittedPhase, warmup: omittedWarmup, mode: omittedMode, done: omittedDone,
        w: omittedW, weight: omittedWeight, r: omittedR, reps: omittedReps,
        sec: omittedSec, min: omittedMin, speed: omittedSpeed, restSec: omittedRest,
        ...metadata
      } = set
      const mode = modeForSet(set, target)
      return {
        ...metadata,
        phase: 'warmup', mode,
        ...(mode === 'time' ? { sec: numberOr(set.sec, 30) } : { reps: numberOr(set.r, 8) }),
        weight: numberOr(set.w, 0),
        ...(set.restSec != null ? { restSec: numberOr(set.restSec, 0) } : {}),
      }
    })
  return { ...target, warmup }
}

/** Apply edited warm-ups without rewriting completed warm-ups or any work row. */
export function applyWarmupConfigToEntry(entry = {}, config = {}) {
  const source = objectOf(entry)
  const sets = Array.isArray(source.sets) ? source.sets : []
  const oldWarmups = sets.filter(set => phaseForSet(set) === 'warmup')
  const workSets = sets.filter(set => phaseForSet(set) === 'work')
  const target = { ...objectOf(source.target), ...objectOf(config) }
  const configured = prependWarmupSets(target, workSets)
    .filter(set => phaseForSet(set) === 'warmup')
  const warmups = []
  oldWarmups.forEach((old, index) => {
    const replacement = configured[index]
    if (old.done === true) warmups.push({ ...old, phase: 'warmup' })
    else if (replacement) warmups.push({ ...old, ...replacement, phase: 'warmup' })
  })
  configured.slice(oldWarmups.length).forEach(set => warmups.push(set))
  return { ...source, target, sets: [...warmups, ...workSets] }
}

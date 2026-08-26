// Exercise input and workout data validation (issue #35).
//
// Ensures invalid values (negative numbers, decimals for reps/sets, NaN, Infinity,
// non-numeric types) cannot enter application state or be saved.

/**
 * Valid reps: non-negative integer.
 */
export function isValidReps(v) {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0
}

/**
 * Valid sets: non-negative integer.
 */
export function isValidSets(v) {
  return typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0
}

/**
 * Valid weight: non-negative number (integers and decimals allowed).
 */
export function isValidWeight(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

/**
 * Validates whole workout state object specifically checking reps, sets, and weight fields.
 */
export function validateWorkoutState(state) {
  if (!state || typeof state !== 'object') return false

  // Validate routines
  if (Array.isArray(state.routines)) {
    for (const r of state.routines) {
      if (r && Array.isArray(r.ex)) {
        for (const e of r.ex) {
          if (!e || typeof e !== 'object') continue
          if (e.sets !== undefined && e.sets !== null && !isValidSets(e.sets)) return false
          if (e.reps !== undefined && e.reps !== null && !isValidReps(e.reps)) return false
          if (e.repsMin !== undefined && e.repsMin !== null && !isValidReps(e.repsMin)) return false
          if (e.repsMax !== undefined && e.repsMax !== null && !isValidReps(e.repsMax)) return false
          if (e.weight !== undefined && e.weight !== null && !isValidWeight(e.weight)) return false
        }
      }
    }
  }

  // Validate completed workouts
  if (Array.isArray(state.workouts)) {
    for (const w of state.workouts) {
      if (!w || typeof w !== 'object') continue
      if (Array.isArray(w.entries)) {
        for (const e of w.entries) {
          if (!e || typeof e !== 'object') continue
          if (e.topW !== undefined && e.topW !== null && !isValidWeight(e.topW)) return false
          if (e.target && typeof e.target === 'object') {
            if (e.target.sets !== undefined && e.target.sets !== null && !isValidSets(e.target.sets)) return false
            if (e.target.reps !== undefined && e.target.reps !== null && !isValidReps(e.target.reps)) return false
            if (e.target.repsMin !== undefined && e.target.repsMin !== null && !isValidReps(e.target.repsMin)) return false
            if (e.target.repsMax !== undefined && e.target.repsMax !== null && !isValidReps(e.target.repsMax)) return false
            if (e.target.weight !== undefined && e.target.weight !== null && !isValidWeight(e.target.weight)) return false
          }
          if (Array.isArray(e.sets)) {
            for (const s of e.sets) {
              if (!s || typeof s !== 'object') continue
              if (s.w !== undefined && s.w !== null && !isValidWeight(s.w)) return false
              if (s.r !== undefined && s.r !== null && !isValidReps(s.r)) return false
            }
          }
        }
      }
    }
  }

  // Validate active workout if present
  if (state.active && typeof state.active === 'object' && Array.isArray(state.active.entries)) {
    for (const e of state.active.entries) {
      if (!e || typeof e !== 'object') continue
      if (e.topW !== undefined && e.topW !== null && !isValidWeight(e.topW)) return false
      if (e.target && typeof e.target === 'object') {
        if (e.target.sets !== undefined && e.target.sets !== null && !isValidSets(e.target.sets)) return false
        if (e.target.reps !== undefined && e.target.reps !== null && !isValidReps(e.target.reps)) return false
        if (e.target.repsMin !== undefined && e.target.repsMin !== null && !isValidReps(e.target.repsMin)) return false
        if (e.target.repsMax !== undefined && e.target.repsMax !== null && !isValidReps(e.target.repsMax)) return false
        if (e.target.weight !== undefined && e.target.weight !== null && !isValidWeight(e.target.weight)) return false
      }
      if (Array.isArray(e.sets)) {
        for (const s of e.sets) {
          if (!s || typeof s !== 'object') continue
          if (s.w !== undefined && s.w !== null && !isValidWeight(s.w)) return false
          if (s.r !== undefined && s.r !== null && !isValidReps(s.r)) return false
        }
      }
    }
  }

  // Validate exWeights
  if (state.exWeights && typeof state.exWeights === 'object') {
    for (const k of Object.keys(state.exWeights)) {
      const item = state.exWeights[k]
      if (item && typeof item === 'object') {
        if (item.w !== undefined && item.w !== null && !isValidWeight(item.w)) return false
      } else if (typeof item === 'number') {
        if (!isValidWeight(item)) return false
      }
    }
  }

  return true
}

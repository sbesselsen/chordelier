import { describe, expect, it } from 'vitest'
import { CURRICULUM, getTaskById, getTasksByDifficulty } from './curriculum'
import { resolveTask } from './resolveTask'
import { pitchClass } from '../theory/pitch'
import type { KeySignature } from '../theory/scale'

const SOME_KEYS: KeySignature[] = [
  { tonicPitchClass: pitchClass(0), scaleType: 'major' }, // C
  { tonicPitchClass: pitchClass(7), scaleType: 'major' }, // G
  { tonicPitchClass: pitchClass(3), scaleType: 'major' }, // Eb
  { tonicPitchClass: pitchClass(10), scaleType: 'major' }, // Bb
]

describe('resolveTask — tier 1 (I IV vi V)', () => {
  const task = getTaskById('diatonic-I-IV-vi-V')
  if (!task) throw new Error('fixture missing')

  it('resolves each step to the right root, transposed across keys', () => {
    for (const key of SOME_KEYS) {
      const steps = resolveTask(task, key)
      expect(steps).toHaveLength(4)
      const [i, iv, vi, v] = steps
      expect(i?.expectedRootPitchClass).toBe(key.tonicPitchClass)
      expect(iv?.expectedRootPitchClass).toBe(pitchClass(key.tonicPitchClass + 5))
      expect(vi?.expectedRootPitchClass).toBe(pitchClass(key.tonicPitchClass + 9))
      expect(v?.expectedRootPitchClass).toBe(pitchClass(key.tonicPitchClass + 7))
    }
  })

  it('falls back to the task-level default grading mode', () => {
    const steps = resolveTask(task, SOME_KEYS[0] as KeySignature)
    expect(steps.every((s) => s.gradingMode === 'pitchClass')).toBe(true)
  })
})

describe('resolveTask — tier 2 (triad inversions)', () => {
  const task = getTaskById('tonic-triad-inversions')
  if (!task) throw new Error('fixture missing')

  it('produces the correct bass pitch class per requested inversion', () => {
    const key: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'major' } // C major -> C E G
    const [root, first, second] = resolveTask(task, key)
    expect(root?.expectedBassPitchClass).toBe(0) // C
    expect(first?.expectedBassPitchClass).toBe(4) // E
    expect(second?.expectedBassPitchClass).toBe(7) // G
    expect(root?.gradingMode).toBe('exactVoicing')
  })
})

describe('resolveTask — tier 3 (diatonic 7ths)', () => {
  const task = getTaskById('ii-V-I-sevenths')
  if (!task) throw new Error('fixture missing')

  it('resolves four-note chords for every step', () => {
    const steps = resolveTask(task, SOME_KEYS[1] as KeySignature)
    expect(steps.every((s) => s.expectedPitchClasses.length === 4)).toBe(true)
  })
})

describe('resolveTask — tier 4 (secondary dominant)', () => {
  const task = getTaskById('secondary-dominant-to-ii')
  if (!task) throw new Error('fixture missing')

  it('resolves V7/ii a major second above ii, independent of the main key', () => {
    for (const key of SOME_KEYS) {
      const [applied, ii] = resolveTask(task, key)
      // ii's root, in a major key, is a major second above the tonic.
      const iiRoot = pitchClass(key.tonicPitchClass + 2)
      expect(ii?.expectedRootPitchClass).toBe(iiRoot)
      // Its secondary dominant sits a perfect fifth above ii.
      expect(applied?.expectedRootPitchClass).toBe(pitchClass(iiRoot + 7))
      expect(applied?.expectedPitchClasses).toHaveLength(4) // dominant 7th
    }
  })

  it('resolves the "ii" step to a plain triad, matching its prompt (no "7")', () => {
    // Regression: the target quality was originally authored as min7 (D F A
    // C) while the prompt just said "ii" — which conventionally means a
    // triad, no "7" suffix. That mismatch meant a correctly-played D minor
    // triad was graded as missing a note the prompt never asked for.
    const key: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'major' }
    const [, ii] = resolveTask(task, key)
    expect(ii?.prompt).toBe('ii')
    expect(ii?.expectedPitchClasses).toEqual([2, 5, 9]) // D F A — triad, no 7th
  })
})

describe('resolveTask — tier 5 (line cliché, fixed key)', () => {
  const task = getTaskById('line-cliche-rising-to-V')
  if (!task) throw new Error('fixture missing')

  it('resolves the chromaticVoice steps via targetIntervals', () => {
    const steps = resolveTask(task, task.fixedKey as KeySignature)
    const [i, iSharp5, i6, v7] = steps

    expect(i?.expectedPitchClasses).toEqual([0, 3, 7]) // C Eb G
    expect(iSharp5?.expectedPitchClasses).toEqual([0, 3, 8]) // C Eb Ab
    expect(i6?.expectedPitchClasses).toEqual([0, 3, 9]) // C Eb A
    expect(v7?.expectedPitchClasses).toEqual([7, 11, 2, 5]) // G B D F

    expect(steps.every((s) => s.gradingMode === 'exactVoicing')).toBe(true)
  })

  it('does not itself enforce keyMode/fixedKey — that is session.ts responsibility', () => {
    // resolveTask is a pure mapper: it trusts whatever KeySignature it's
    // handed and has no opinion on whether that matches the task's own
    // keyMode. Picking the right key (respecting 'fixed' vs 'randomize') is
    // resolveSessionKey's job, not this function's — documented here so
    // that separation of concerns doesn't silently drift.
    const wrongKey: KeySignature = { tonicPitchClass: pitchClass(7), scaleType: 'major' }
    const steps = resolveTask(task, wrongKey)
    expect(steps[0]?.expectedRootPitchClass).toBe(7) // G, not the fixed key's C
  })
})

describe('resolveTask — every curriculum fixture, sanity pass', () => {
  it('resolves without throwing for every task at every difficulty tier', () => {
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      const tasks = getTasksByDifficulty(difficulty as 1 | 2 | 3 | 4 | 5)
      expect(tasks.length).toBeGreaterThan(0)
      for (const task of tasks) {
        const key = task.keyMode === 'fixed' ? (task.fixedKey as KeySignature) : SOME_KEYS[0]
        expect(() => resolveTask(task, key as KeySignature)).not.toThrow()
      }
    }
  })

  it('covers all 5 confirmed difficulty tiers exactly once each in v1', () => {
    expect(CURRICULUM.map((t) => t.difficulty).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

import { describe, expect, it } from 'vitest'
import { evaluateAttempt } from './grading'
import type { ResolvedTaskStep } from './resolveTask'
import { midiNote, pitchClass } from '../theory/pitch'

const PITCH_CLASS_STEP: ResolvedTaskStep = {
  id: 's1',
  expectedPitchClasses: [pitchClass(0), pitchClass(4), pitchClass(7)], // C E G
  expectedRootPitchClass: pitchClass(0),
  expectedBassPitchClass: pitchClass(0),
  gradingMode: 'pitchClass',
  displayChordName: 'C',
}

const EXACT_VOICING_STEP: ResolvedTaskStep = { ...PITCH_CLASS_STEP, gradingMode: 'exactVoicing' }

describe('evaluateAttempt — noAttempt', () => {
  it('reports noAttempt (not incorrect) for zero held notes', () => {
    const evaluation = evaluateAttempt(new Set(), PITCH_CLASS_STEP)
    expect(evaluation.result).toBe('noAttempt')
    expect(evaluation.score).toBe(0)
    expect(evaluation.missingPitchClasses).toEqual([0, 4, 7])
  })
})

describe('evaluateAttempt — pitchClass grading', () => {
  it('is correct for the right pitch classes in any octave/voicing', () => {
    const held = new Set([midiNote(72), midiNote(52), midiNote(67)]) // C5 E3 G4, any order/octave
    const evaluation = evaluateAttempt(held, PITCH_CLASS_STEP)
    expect(evaluation.result).toBe('correct')
    expect(evaluation.score).toBe(1)
  })

  it('ignores bass/inversion entirely, even with a "wrong" bass note', () => {
    const held = new Set([midiNote(64), midiNote(67), midiNote(72)])
    const evaluation = evaluateAttempt(held, PITCH_CLASS_STEP)
    expect(evaluation.result).toBe('correct')
    expect(evaluation.bassOk).toBe(true) // bassOk is vacuously true outside exactVoicing
  })

  it('is partial when missing a chord tone', () => {
    const held = new Set([midiNote(60), midiNote(64)]) // missing G
    const evaluation = evaluateAttempt(held, PITCH_CLASS_STEP)
    expect(evaluation.result).toBe('partial')
    expect(evaluation.missingPitchClasses).toEqual([7])
    expect(evaluation.score).toBeGreaterThanOrEqual(0.5)
    expect(evaluation.score).toBeLessThan(0.9)
  })

  it('is incorrect when an extra wrong note is present, regardless of missing notes', () => {
    const held = new Set([midiNote(60), midiNote(64), midiNote(67), midiNote(61)]) // + Db
    const evaluation = evaluateAttempt(held, PITCH_CLASS_STEP)
    expect(evaluation.result).toBe('incorrect')
    expect(evaluation.wrongPitchClasses).toEqual([1])
  })
})

describe('evaluateAttempt — exactVoicing grading', () => {
  it('is correct only with the right bass note', () => {
    const rootPosition = new Set([midiNote(48), midiNote(52), midiNote(55)]) // C in the bass
    expect(evaluateAttempt(rootPosition, EXACT_VOICING_STEP).result).toBe('correct')

    const firstInversion = new Set([midiNote(52), midiNote(55), midiNote(60)]) // E in the bass
    const evaluation = evaluateAttempt(firstInversion, EXACT_VOICING_STEP)
    expect(evaluation.result).toBe('partial') // right notes, wrong voicing
    expect(evaluation.bassOk).toBe(false)
    // Regression: these must be populated so the UI can actually explain
    // *what* was wrong (missing/wrongPitchClasses are both empty here).
    expect(evaluation.expectedBassPitchClass).toBe(0) // C
    expect(evaluation.actualBassPitchClass).toBe(4) // E
  })

  it('does not care about octave placement of the bass, only its pitch class', () => {
    const held = new Set([midiNote(24), midiNote(52), midiNote(67)]) // C1 in the bass, two octaves down
    expect(evaluateAttempt(held, EXACT_VOICING_STEP).result).toBe('correct')
  })
})

describe('evaluateAttempt — severity ordering (wrong > missing > voicing slip)', () => {
  it('never lets a worse category outscore a better one', () => {
    const correct = evaluateAttempt(
      new Set([midiNote(60), midiNote(64), midiNote(67)]),
      PITCH_CLASS_STEP,
    )
    const missingOne = evaluateAttempt(new Set([midiNote(60), midiNote(64)]), PITCH_CLASS_STEP)
    const missingTwo = evaluateAttempt(new Set([midiNote(60)]), PITCH_CLASS_STEP)
    const voicingSlip = evaluateAttempt(
      new Set([midiNote(64), midiNote(67), midiNote(72)]), // E4 G4 C5 — E is lowest
      EXACT_VOICING_STEP,
    ) // right notes, but E in the bass instead of C — wrong voicing
    const wrongNote = evaluateAttempt(
      new Set([midiNote(60), midiNote(64), midiNote(67), midiNote(61)]),
      PITCH_CLASS_STEP,
    )
    const allWrong = evaluateAttempt(
      new Set([midiNote(61), midiNote(63), midiNote(66)]),
      PITCH_CLASS_STEP,
    )

    expect(correct.result).toBe('correct')
    expect(missingOne.result).toBe('partial')
    expect(missingTwo.result).toBe('partial')
    expect(voicingSlip.result).toBe('partial')
    expect(wrongNote.result).toBe('incorrect')
    expect(allWrong.result).toBe('incorrect')

    // correct > every partial > every incorrect, no matter how mild/severe within a band.
    expect(correct.score).toBeGreaterThan(missingOne.score)
    expect(correct.score).toBeGreaterThan(voicingSlip.score)
    expect(missingOne.score).toBeGreaterThanOrEqual(missingTwo.score) // worse miss, same-or-lower score
    expect(voicingSlip.score).toBeGreaterThan(wrongNote.score)
    expect(missingTwo.score).toBeGreaterThan(wrongNote.score)
    expect(wrongNote.score).toBeGreaterThanOrEqual(allWrong.score)

    for (const partial of [missingOne, missingTwo, voicingSlip]) {
      expect(partial.score).toBeGreaterThanOrEqual(0.5)
      expect(partial.score).toBeLessThanOrEqual(0.9)
    }
    for (const incorrect of [wrongNote, allWrong]) {
      expect(incorrect.score).toBeGreaterThanOrEqual(0)
      expect(incorrect.score).toBeLessThanOrEqual(0.45)
    }
  })
})

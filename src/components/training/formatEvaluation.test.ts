import { describe, expect, it } from 'vitest'
import { formatEvaluationDiagnostics } from './formatEvaluation'
import type { StepEvaluation } from '../../training/grading'
import { pitchClass } from '../../theory/pitch'

function evaluation(overrides: Partial<StepEvaluation>): StepEvaluation {
  return {
    result: 'correct',
    score: 1,
    wrongPitchClasses: [],
    missingPitchClasses: [],
    bassOk: true,
    expectedBassPitchClass: pitchClass(0),
    actualBassPitchClass: pitchClass(0),
    ...overrides,
  }
}

describe('formatEvaluationDiagnostics', () => {
  it('is empty for a fully correct evaluation', () => {
    expect(formatEvaluationDiagnostics(evaluation({}))).toBe('')
  })

  it('reports missing pitch classes', () => {
    const text = formatEvaluationDiagnostics(evaluation({ missingPitchClasses: [pitchClass(7)] }))
    expect(text).toBe('Missing G')
  })

  it('reports wrong (extra) pitch classes', () => {
    const text = formatEvaluationDiagnostics(evaluation({ wrongPitchClasses: [pitchClass(1)] }))
    expect(text).toBe('Extra D♭')
  })

  it('reports a wrong bass note even when pitch classes are all correct', () => {
    // Regression: this is exactly the exactVoicing "right notes, wrong
    // inversion" case (e.g. the line-cliché V7 step played in some
    // inversion instead of root position). Both missing/wrong lists are
    // empty here, so without a dedicated bass clause this silently
    // produced an empty string — a "close" with no explanation at all.
    const text = formatEvaluationDiagnostics(
      evaluation({
        bassOk: false,
        expectedBassPitchClass: pitchClass(7), // G
        actualBassPitchClass: pitchClass(2), // D
      }),
    )
    expect(text).toBe('Wrong bass note (played D, needs G)')
  })

  it('combines a missing note and a wrong bass note', () => {
    const text = formatEvaluationDiagnostics(
      evaluation({
        missingPitchClasses: [pitchClass(5)],
        bassOk: false,
        expectedBassPitchClass: pitchClass(7),
        actualBassPitchClass: pitchClass(2),
      }),
    )
    expect(text).toBe('Missing F · Wrong bass note (played D, needs G)')
  })

  it('does not mention the bass when there was no attempt at all', () => {
    const text = formatEvaluationDiagnostics(
      evaluation({
        result: 'noAttempt',
        missingPitchClasses: [pitchClass(0), pitchClass(4), pitchClass(7)],
        bassOk: false,
        actualBassPitchClass: null,
      }),
    )
    expect(text).toBe('Missing C, E, G')
  })
})

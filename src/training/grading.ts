import { type MidiNoteNumber, type PitchClass, lowestNote, toPitchClass } from '../theory/pitch'
import type { ResolvedTaskStep } from './resolveTask'

export type StepResult = 'correct' | 'partial' | 'incorrect' | 'noAttempt'

export interface StepEvaluation {
  result: StepResult
  /** 0-1, banded by result so category order can never invert in an aggregate score. */
  score: number
  wrongPitchClasses: readonly PitchClass[]
  missingPitchClasses: readonly PitchClass[]
  bassOk: boolean
}

export function evaluateAttempt(
  heldNotes: ReadonlySet<MidiNoteNumber>,
  step: ResolvedTaskStep,
): StepEvaluation {
  if (heldNotes.size === 0) {
    return {
      result: 'noAttempt',
      score: 0,
      wrongPitchClasses: [],
      missingPitchClasses: step.expectedPitchClasses,
      bassOk: false,
    }
  }

  const held = new Set([...heldNotes].map(toPitchClass))
  const expected = new Set(step.expectedPitchClasses)
  const wrongPitchClasses = [...held].filter((pc) => !expected.has(pc))
  const missingPitchClasses = [...expected].filter((pc) => !held.has(pc))

  const bass = lowestNote(heldNotes)
  if (bass === null) throw new Error('unreachable: heldNotes is non-empty here')
  const bassOk =
    step.gradingMode !== 'exactVoicing' || toPitchClass(bass) === step.expectedBassPitchClass

  const result: StepResult =
    wrongPitchClasses.length > 0
      ? 'incorrect'
      : missingPitchClasses.length > 0 || !bassOk
        ? 'partial'
        : 'correct'

  const score =
    result === 'correct'
      ? 1
      : result === 'partial'
        ? Math.max(
            0.5,
            0.9 - 0.4 * (missingPitchClasses.length / expected.size) - (bassOk ? 0 : 0.1),
          )
        : 0.45 * Math.max(0, 1 - wrongPitchClasses.length / held.size)

  return { result, score, wrongPitchClasses, missingPitchClasses, bassOk }
}

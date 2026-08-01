import { pitchClassName } from '../../theory/spelling'
import type { StepEvaluation } from '../../training/grading'

/**
 * "Missing X, Y · Extra Z · Wrong bass note (played A, needs B)" — empty
 * string for a fully correct evaluation. The bass clause is what a
 * right-notes-wrong-inversion exactVoicing 'partial' needs: without it,
 * missingPitchClasses and wrongPitchClasses are both empty and this
 * function silently had nothing to say about the one thing that was
 * actually wrong.
 */
export function formatEvaluationDiagnostics(evaluation: StepEvaluation): string {
  const parts: string[] = []
  if (evaluation.missingPitchClasses.length > 0) {
    parts.push(
      `Missing ${evaluation.missingPitchClasses.map((pc) => pitchClassName(pc)).join(', ')}`,
    )
  }
  if (evaluation.wrongPitchClasses.length > 0) {
    parts.push(`Extra ${evaluation.wrongPitchClasses.map((pc) => pitchClassName(pc)).join(', ')}`)
  }
  if (!evaluation.bassOk && evaluation.actualBassPitchClass !== null) {
    parts.push(
      `Wrong bass note (played ${pitchClassName(evaluation.actualBassPitchClass)}, needs ${pitchClassName(evaluation.expectedBassPitchClass)})`,
    )
  }
  return parts.join(' · ')
}

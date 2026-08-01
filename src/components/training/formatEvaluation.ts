import { pitchClassName } from '../../theory/spelling'
import type { StepEvaluation } from '../../training/grading'

/** "Missing X, Y · Extra Z" — empty string for a fully correct evaluation. */
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
  return parts.join(' · ')
}

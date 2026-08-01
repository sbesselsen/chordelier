import type { StepDisplayStatus } from '../../training/useTrainingTask'

export const STEP_STATUS_SYMBOL: Record<StepDisplayStatus, string> = {
  pending: '○',
  current: '●',
  correct: '✓',
  partial: '~',
  incorrect: '✗',
  noAttempt: '·',
  skipped: '»',
}

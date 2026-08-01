import type { StepReview } from '../../training/useTrainingTask'
import { formatEvaluationDiagnostics } from './formatEvaluation'
import { STEP_STATUS_SYMBOL } from './resultSymbols'

export interface TrainingResultsSummaryProps {
  taskTitle: string
  wasAbandoned: boolean
  stepReviews: readonly StepReview[]
  onPlayAgain: () => void
  onBackToSetup: () => void
}

interface Tally {
  correct: number
  partial: number
  missed: number // incorrect + noAttempt, both read as "missed" to the trainee
  skipped: number
  attempted: number
}

function tally(stepReviews: readonly StepReview[]): Tally {
  const counts: Tally = { correct: 0, partial: 0, missed: 0, skipped: 0, attempted: 0 }
  for (const step of stepReviews) {
    switch (step.status) {
      case 'correct':
        counts.correct++
        counts.attempted++
        break
      case 'partial':
        counts.partial++
        counts.attempted++
        break
      case 'incorrect':
      case 'noAttempt':
        counts.missed++
        counts.attempted++
        break
      case 'skipped':
        counts.skipped++
        counts.attempted++
        break
      default:
        break // pending/current: never attempted — only possible on an abandoned session
    }
  }
  return counts
}

export function TrainingResultsSummary({
  taskTitle,
  wasAbandoned,
  stepReviews,
  onPlayAgain,
  onBackToSetup,
}: TrainingResultsSummaryProps) {
  const counts = tally(stepReviews)

  return (
    <div className="training-results-summary">
      <h2>{wasAbandoned ? 'Session ended' : 'Nice work!'}</h2>
      <p>{taskTitle}</p>
      <p className="training-results-summary__tally">
        {counts.attempted} / {stepReviews.length} steps attempted — {counts.correct} correct,{' '}
        {counts.partial} close, {counts.missed} missed
        {counts.skipped > 0 ? `, ${counts.skipped} skipped` : ''}
      </p>

      <ol className="training-results-summary__breakdown">
        {stepReviews.map((step) => (
          <li
            key={step.id}
            className={`training-results-summary__step training-results-summary__step--${step.status}`}
          >
            <span className="training-results-summary__step-symbol" aria-hidden="true">
              {STEP_STATUS_SYMBOL[step.status]}
            </span>
            <span className="training-results-summary__step-prompt">{step.prompt ?? step.id}</span>
            {step.status === 'skipped' && (
              <span className="training-results-summary__step-diagnostics">Skipped</span>
            )}
            {step.evaluation && step.status !== 'correct' && (
              <span className="training-results-summary__step-diagnostics">
                {formatEvaluationDiagnostics(step.evaluation)}
              </span>
            )}
          </li>
        ))}
      </ol>

      <div className="training-results-summary__actions">
        <button type="button" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" onClick={onBackToSetup}>
          Choose another task
        </button>
      </div>
    </div>
  )
}

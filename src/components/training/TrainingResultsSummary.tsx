import type { StepOutcomeRecord } from '../../training/taskMachine'
import { STEP_STATUS_SYMBOL } from './resultSymbols'

export interface TrainingResultsSummaryProps {
  taskTitle: string
  wasAbandoned: boolean
  totalSteps: number
  stepResults: readonly StepOutcomeRecord[]
  onPlayAgain: () => void
  onBackToSetup: () => void
}

interface Tally {
  correct: number
  partial: number
  missed: number // incorrect + noAttempt, both read as "missed" to the trainee
  skipped: number
}

function tally(stepResults: readonly StepOutcomeRecord[]): Tally {
  const counts: Tally = { correct: 0, partial: 0, missed: 0, skipped: 0 }
  for (const record of stepResults) {
    if (record.outcome.type === 'skipped') {
      counts.skipped++
      continue
    }
    const { result } = record.outcome.evaluation
    if (result === 'correct') counts.correct++
    else if (result === 'partial') counts.partial++
    else counts.missed++
  }
  return counts
}

export function TrainingResultsSummary({
  taskTitle,
  wasAbandoned,
  totalSteps,
  stepResults,
  onPlayAgain,
  onBackToSetup,
}: TrainingResultsSummaryProps) {
  const counts = tally(stepResults)

  return (
    <div className="training-results-summary">
      <h2>{wasAbandoned ? 'Session ended' : 'Nice work!'}</h2>
      <p>{taskTitle}</p>
      <p className="training-results-summary__tally">
        {stepResults.length} / {totalSteps} steps attempted — {counts.correct} correct,{' '}
        {counts.partial} close, {counts.missed} missed
        {counts.skipped > 0 ? `, ${counts.skipped} skipped` : ''}
      </p>

      <ol className="training-results-summary__steps">
        {stepResults.map((record, index) => (
          <li key={`${record.stepId}-${index}`} aria-hidden="true">
            {record.outcome.type === 'skipped'
              ? STEP_STATUS_SYMBOL.skipped
              : STEP_STATUS_SYMBOL[record.outcome.evaluation.result]}
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

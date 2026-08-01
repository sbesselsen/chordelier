import type { StepReview } from '../../training/useTrainingTask'
import { STEP_STATUS_SYMBOL } from './resultSymbols'

export interface TaskStepIndicatorProps {
  steps: readonly Pick<StepReview, 'id' | 'status'>[]
}

export function TaskStepIndicator({ steps }: TaskStepIndicatorProps) {
  return (
    <ol className="task-step-indicator">
      {steps.map((step) => (
        <li
          key={step.id}
          className={`task-step-indicator__step task-step-indicator__step--${step.status}`}
        >
          <span aria-hidden="true">{STEP_STATUS_SYMBOL[step.status]}</span>
          <span className="visually-hidden">{step.status}</span>
        </li>
      ))}
    </ol>
  )
}

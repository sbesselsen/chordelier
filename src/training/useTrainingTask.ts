import { useActorRef, useSelector } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { useHeldNotes } from '../input/useHeldNotes'
import type { KeySignature } from '../theory/scale'
import type { StepEvaluation } from './grading'
import { resolveTask } from './resolveTask'
import { type StepOutcomeRecord, taskMachine } from './taskMachine'
import type { TaskDefinition } from './taskSchema'

export type TrainingTaskStatus = 'listening' | 'graded' | 'complete' | 'abandoned'

/** Richer than StepResult — adds the two states a step can be in before it's ever graded. */
export type StepDisplayStatus =
  'pending' | 'current' | 'correct' | 'partial' | 'incorrect' | 'noAttempt' | 'skipped'

export interface StepStatusEntry {
  id: string
  status: StepDisplayStatus
}

export interface TrainingTaskViewModel {
  status: TrainingTaskStatus
  stepIndex: number
  totalSteps: number
  currentPrompt?: string
  currentDisplayChordName?: string
  lastEvaluation: StepEvaluation | null
  stepResults: readonly StepOutcomeRecord[]
  stepStatuses: readonly StepStatusEntry[]
  skip: () => void
  abandon: () => void
  reset: () => void
}

export function useTrainingTask(
  task: TaskDefinition,
  sessionKey: KeySignature,
): TrainingTaskViewModel {
  const resolvedSteps = useMemo(() => resolveTask(task, sessionKey), [task, sessionKey])
  const actorRef = useActorRef(taskMachine, { input: { resolvedSteps } })
  const heldNotes = useHeldNotes()

  const status = useSelector(actorRef, (snapshot): TrainingTaskStatus => {
    if (snapshot.matches('graded')) return 'graded'
    if (snapshot.matches('complete')) return 'complete'
    if (snapshot.matches('abandoned')) return 'abandoned'
    return 'listening'
  })
  const stepIndex = useSelector(actorRef, (snapshot) => snapshot.context.currentStepIndex)
  const lastEvaluation = useSelector(actorRef, (snapshot) => snapshot.context.lastEvaluation)
  const stepResults = useSelector(actorRef, (snapshot) => snapshot.context.stepResults)

  useEffect(() => {
    actorRef.send({ type: 'NOTES_CHANGED', heldNotes })
    // Also re-seeds on stepIndex change (not just heldNotes change): a step
    // that starts with a held-over common tone and no further physical key
    // change would otherwise never get a NOTES_CHANGED event to arm its
    // debounce at all.
  }, [actorRef, heldNotes, stepIndex])

  const currentStep = resolvedSteps[stepIndex]

  const stepStatuses = useMemo<StepStatusEntry[]>(
    () =>
      resolvedSteps.map((step, index) => {
        const recorded = stepResults[index]
        const stepStatus: StepDisplayStatus = recorded
          ? recorded.outcome.type === 'skipped'
            ? 'skipped'
            : recorded.outcome.evaluation.result
          : index === stepIndex
            ? 'current'
            : 'pending'
        return { id: step.id, status: stepStatus }
      }),
    [resolvedSteps, stepResults, stepIndex],
  )

  return {
    status,
    stepIndex,
    totalSteps: resolvedSteps.length,
    currentPrompt: currentStep?.prompt,
    currentDisplayChordName: currentStep?.displayChordName,
    lastEvaluation,
    stepResults,
    stepStatuses,
    skip: () => actorRef.send({ type: 'SKIP_STEP' }),
    abandon: () => actorRef.send({ type: 'ABANDON' }),
    reset: () => actorRef.send({ type: 'RESET' }),
  }
}

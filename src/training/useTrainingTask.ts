import { useActorRef, useSelector } from '@xstate/react'
import { useEffect, useMemo } from 'react'
import { useHeldNotes } from '../input/useHeldNotes'
import type { KeySignature } from '../theory/scale'
import type { StepEvaluation } from './grading'
import { resolveTask } from './resolveTask'
import { taskMachine } from './taskMachine'
import type { TaskDefinition } from './taskSchema'

export type TrainingTaskStatus = 'listening' | 'graded' | 'complete' | 'abandoned'

/** Richer than StepResult — adds the two states a step can be in before it's ever graded. */
export type StepDisplayStatus =
  'pending' | 'current' | 'correct' | 'partial' | 'incorrect' | 'noAttempt' | 'skipped'

/** Per-step summary carrying enough to render both the in-progress step indicator and the post-session breakdown from one source. */
export interface StepReview {
  id: string
  prompt?: string
  status: StepDisplayStatus
  /** Present only for graded (not skipped/pending/current) steps — the missing/wrong-note detail survives past the brief in-progress feedback window. */
  evaluation: StepEvaluation | null
}

export interface TrainingTaskViewModel {
  status: TrainingTaskStatus
  stepIndex: number
  totalSteps: number
  currentPrompt?: string
  currentDisplayChordName?: string
  lastEvaluation: StepEvaluation | null
  stepReviews: readonly StepReview[]
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
    // Deliberately keyed on heldNotes only, not stepIndex. An earlier
    // version also re-sent on every step transition so a step starting on a
    // held-over common tone couldn't stall forever — but that meant resting
    // motionless on the previous (already-graded) chord shape for long
    // enough would silently grade the *new* step against stale input the
    // user never actually played for it, contradicting "no time pressure."
    // Requiring a genuine change is also strictly correct for real
    // common-tone carryover: moving from one chord to the next always
    // changes at least one note, which is itself a real heldNotes event —
    // so voice-leading exercises still work with zero special-casing here.
    actorRef.send({ type: 'NOTES_CHANGED', heldNotes })
  }, [actorRef, heldNotes])

  const currentStep = resolvedSteps[stepIndex]

  const stepReviews = useMemo<StepReview[]>(
    () =>
      resolvedSteps.map((step, index) => {
        const recorded = stepResults[index]
        if (!recorded) {
          return {
            id: step.id,
            prompt: step.prompt,
            status: index === stepIndex ? 'current' : 'pending',
            evaluation: null,
          }
        }
        if (recorded.outcome.type === 'skipped') {
          return { id: step.id, prompt: step.prompt, status: 'skipped', evaluation: null }
        }
        return {
          id: step.id,
          prompt: step.prompt,
          status: recorded.outcome.evaluation.result,
          evaluation: recorded.outcome.evaluation,
        }
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
    stepReviews,
    skip: () => actorRef.send({ type: 'SKIP_STEP' }),
    abandon: () => actorRef.send({ type: 'ABANDON' }),
    reset: () => actorRef.send({ type: 'RESET' }),
  }
}

import { assign, setup } from 'xstate'
import { type StepEvaluation, evaluateAttempt } from './grading'
import type { ResolvedTaskStep } from './resolveTask'
import type { MidiNoteNumber } from '../theory/pitch'

/** Grade once the held-note set is unchanged for this long. Tunable — raise it if grading ever feels trigger-happy, lower it if it feels laggy. */
const SETTLE_MS = 600
/** How long the ✓/~/✗ result shows before auto-advancing to the next step. */
const FEEDBACK_MS = 500

export interface StepOutcomeRecord {
  stepId: string
  outcome: { type: 'graded'; evaluation: StepEvaluation } | { type: 'skipped' }
}

interface Context {
  resolvedSteps: readonly ResolvedTaskStep[]
  currentStepIndex: number
  stepResults: readonly StepOutcomeRecord[]
  /** Array, not Set — keeps context JSON-serializable/inspectable. */
  heldNotesSnapshot: readonly MidiNoteNumber[]
  lastEvaluation: StepEvaluation | null
}

type Event =
  | { type: 'NOTES_CHANGED'; heldNotes: ReadonlySet<MidiNoteNumber> }
  | { type: 'SKIP_STEP' }
  | { type: 'ABANDON' }
  | { type: 'RESET' }

interface Input {
  resolvedSteps: readonly ResolvedTaskStep[]
}

export interface TaskOutput {
  stepResults: readonly StepOutcomeRecord[]
}

function currentStep(context: Context): ResolvedTaskStep {
  const step = context.resolvedSteps[context.currentStepIndex]
  if (!step) throw new Error(`No step at index ${context.currentStepIndex}`)
  return step
}

export const taskMachine = setup({
  types: {} as { context: Context; events: Event; input: Input; output: TaskOutput },
  guards: {
    hasHeldNotes: ({ context }) => context.heldNotesSnapshot.length > 0,
    isLastStep: ({ context }) => context.currentStepIndex === context.resolvedSteps.length - 1,
  },
  actions: {
    assignSnapshot: assign(({ event }) => {
      if (event.type !== 'NOTES_CHANGED') return {}
      return { heldNotesSnapshot: [...event.heldNotes] }
    }),
    recordEvaluation: assign(({ context }) => {
      const step = currentStep(context)
      const evaluation = evaluateAttempt(new Set(context.heldNotesSnapshot), step)
      return {
        lastEvaluation: evaluation,
        stepResults: [
          ...context.stepResults,
          { stepId: step.id, outcome: { type: 'graded', evaluation } },
        ],
      } satisfies Partial<Context>
    }),
    recordSkip: assign(({ context }) => {
      const step = currentStep(context)
      return {
        stepResults: [...context.stepResults, { stepId: step.id, outcome: { type: 'skipped' } }],
      } satisfies Partial<Context>
    }),
    advanceStep: assign(({ context }) => ({
      currentStepIndex: context.currentStepIndex + 1,
      lastEvaluation: null,
    })),
    resetContext: assign(() => ({
      currentStepIndex: 0,
      stepResults: [],
      heldNotesSnapshot: [],
      lastEvaluation: null,
    })),
  },
}).createMachine({
  id: 'task',
  context: ({ input }) => ({
    resolvedSteps: input.resolvedSteps,
    currentStepIndex: 0,
    stepResults: [],
    heldNotesSnapshot: [],
    lastEvaluation: null,
  }),
  initial: 'listening',
  // The actor's overall `.output` comes from THIS root-level resolver, not
  // from an individual final child state's own `output` — that child value
  // only flows in here as `event.output`. Kept as a pass-through so
  // 'complete' can supply stepResults while 'abandoned' (no output of its
  // own) naturally yields undefined.
  output: ({ event }) => event.output as TaskOutput,
  on: {
    ABANDON: '.abandoned',
    RESET: { target: '.listening', actions: 'resetContext' },
  },
  states: {
    listening: {
      initial: 'awaitingInput',
      on: {
        SKIP_STEP: { actions: 'recordSkip', target: '#task.advancing' },
      },
      states: {
        // Requires a NOTES_CHANGED event since THIS step started before the
        // debounce can arm — otherwise a held common tone carried over from
        // the previous step would immediately grade the new step against
        // stale input the user never actually played for it.
        awaitingInput: {
          on: { NOTES_CHANGED: { actions: 'assignSnapshot', target: 'settling' } },
        },
        settling: {
          on: {
            // reenter: true is required in XState v5 — without it this
            // self-transition doesn't reset the `after` timer (v4's
            // default), so the 600ms window would be measured once from the
            // first note of a step rather than debouncing every change.
            NOTES_CHANGED: { actions: 'assignSnapshot', target: 'settling', reenter: true },
          },
          after: {
            [SETTLE_MS]: { guard: 'hasHeldNotes', target: '#task.graded' },
          },
        },
      },
    },
    graded: {
      entry: 'recordEvaluation',
      after: {
        [FEEDBACK_MS]: 'advancing',
      },
    },
    advancing: {
      always: [
        { guard: 'isLastStep', target: 'complete' },
        { actions: 'advanceStep', target: 'listening' },
      ],
    },
    complete: {
      type: 'final',
      output: ({ context }) => ({ stepResults: context.stepResults }),
    },
    // Carries whatever partial stepResults were recorded before abandoning,
    // rather than nothing — a summary UI can still show "N of M steps" for
    // an abandoned session.
    abandoned: {
      type: 'final',
      output: ({ context }) => ({ stepResults: context.stepResults }),
    },
  },
})

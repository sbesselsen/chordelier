import { createActor } from 'xstate'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { taskMachine } from './taskMachine'
import type { ResolvedTaskStep } from './resolveTask'
import { midiNote, pitchClass } from '../theory/pitch'

const SETTLE_MS = 600
const FEEDBACK_MS = 500

function step(
  overrides: Partial<ResolvedTaskStep> & Pick<ResolvedTaskStep, 'id'>,
): ResolvedTaskStep {
  return {
    expectedPitchClasses: [pitchClass(0), pitchClass(4), pitchClass(7)], // C E G
    expectedRootPitchClass: pitchClass(0),
    expectedBassPitchClass: pitchClass(0),
    gradingMode: 'pitchClass',
    displayChordName: 'C',
    ...overrides,
  }
}

const STEP_1 = step({ id: 's1', prompt: 'I' })
const STEP_2 = step({
  id: 's2',
  prompt: 'IV',
  expectedPitchClasses: [pitchClass(5), pitchClass(9), pitchClass(0)], // F A C
  expectedRootPitchClass: pitchClass(5),
  expectedBassPitchClass: pitchClass(5),
})

function startActor(steps: ResolvedTaskStep[]) {
  const actor = createActor(taskMachine, { input: { resolvedSteps: steps } })
  actor.start()
  return actor
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('taskMachine — happy path', () => {
  it('grades a correct attempt after the settle delay and auto-advances', () => {
    const actor = startActor([STEP_1, STEP_2])
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })

    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })
    expect(actor.getSnapshot().value).toEqual({ listening: 'settling' })

    vi.advanceTimersByTime(SETTLE_MS)
    expect(actor.getSnapshot().value).toBe('graded')
    expect(actor.getSnapshot().context.lastEvaluation?.result).toBe('correct')

    vi.advanceTimersByTime(FEEDBACK_MS)
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1)
    expect(actor.getSnapshot().context.stepResults).toEqual([
      {
        stepId: 's1',
        outcome: { type: 'graded', evaluation: expect.objectContaining({ result: 'correct' }) },
      },
    ])
  })

  it('completes with output after the last step is graded', () => {
    const actor = startActor([STEP_1])
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })
    vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS)

    const snapshot = actor.getSnapshot()
    expect(snapshot.status).toBe('done')
    expect(snapshot.value).toBe('complete')
    expect(snapshot.output).toEqual({
      stepResults: [
        {
          stepId: 's1',
          outcome: { type: 'graded', evaluation: expect.objectContaining({ result: 'correct' }) },
        },
      ],
    })
  })
})

describe('taskMachine — debounce correctness (reenter regression)', () => {
  it('does not grade until SETTLE_MS after the LAST note change, not the first', () => {
    const actor = startActor([STEP_1])

    actor.send({ type: 'NOTES_CHANGED', heldNotes: new Set([midiNote(60)]) })
    vi.advanceTimersByTime(400)
    actor.send({ type: 'NOTES_CHANGED', heldNotes: new Set([midiNote(60), midiNote(64)]) })
    vi.advanceTimersByTime(400)
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })

    // 800ms have passed since the first event (> SETTLE_MS), but only 400ms
    // since the last one — must still be waiting. If the self-transition on
    // 'settling' weren't reentrant, this would already have graded.
    vi.advanceTimersByTime(400)
    expect(actor.getSnapshot().value).toEqual({ listening: 'settling' })

    vi.advanceTimersByTime(200)
    expect(actor.getSnapshot().value).toBe('graded')
    expect(actor.getSnapshot().context.lastEvaluation?.result).toBe('correct')
  })

  it('never grades while notes keep changing faster than SETTLE_MS', () => {
    const actor = startActor([STEP_1])
    for (let i = 0; i < 5; i++) {
      actor.send({ type: 'NOTES_CHANGED', heldNotes: new Set([midiNote(60 + i)]) })
      vi.advanceTimersByTime(SETTLE_MS - 100)
    }
    expect(actor.getSnapshot().value).toEqual({ listening: 'settling' })
  })
})

describe('taskMachine — stale notes at step entry', () => {
  it('does not auto-grade a new step against notes held over with no fresh input', () => {
    const actor = startActor([STEP_1, STEP_2])
    const cMajor = new Set([midiNote(60), midiNote(64), midiNote(67)])
    actor.send({ type: 'NOTES_CHANGED', heldNotes: cMajor })
    vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS)
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1)
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })

    // No NOTES_CHANGED sent for step 2 — even though notes are still held,
    // awaitingInput must not auto-arm the settle timer on its own.
    vi.advanceTimersByTime(SETTLE_MS * 3)
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })
    expect(actor.getSnapshot().context.lastEvaluation).toBeNull()
  })

  it('grades correctly once a fresh input event arrives for the new step', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })
    vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS)

    // Move to F A C (step 2), keeping C held (common tone) while changing the rest.
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(65), midiNote(69)]),
    })
    vi.advanceTimersByTime(SETTLE_MS)
    expect(actor.getSnapshot().context.lastEvaluation?.result).toBe('correct')
  })
})

describe('taskMachine — grading outcomes reach stepResults', () => {
  it('records partial and incorrect evaluations too, not just correct', () => {
    const actor = startActor([STEP_1])
    actor.send({ type: 'NOTES_CHANGED', heldNotes: new Set([midiNote(60), midiNote(64)]) }) // missing G
    vi.advanceTimersByTime(SETTLE_MS)
    expect(actor.getSnapshot().context.lastEvaluation?.result).toBe('partial')
  })
})

describe('taskMachine — skip', () => {
  it('records a skipped outcome and advances without grading', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({ type: 'SKIP_STEP' })
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1)
    expect(actor.getSnapshot().context.stepResults).toEqual([
      { stepId: 's1', outcome: { type: 'skipped' } },
    ])
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })
  })

  it('can skip while mid-debounce too', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({ type: 'NOTES_CHANGED', heldNotes: new Set([midiNote(60)]) })
    expect(actor.getSnapshot().value).toEqual({ listening: 'settling' })
    actor.send({ type: 'SKIP_STEP' })
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1)
  })

  it('completes via skip on the last step', () => {
    const actor = startActor([STEP_1])
    actor.send({ type: 'SKIP_STEP' })
    expect(actor.getSnapshot().status).toBe('done')
    expect(actor.getSnapshot().output).toEqual({
      stepResults: [{ stepId: 's1', outcome: { type: 'skipped' } }],
    })
  })
})

describe('taskMachine — abandon and reset', () => {
  it('ABANDON ends the task from listening', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({ type: 'ABANDON' })
    expect(actor.getSnapshot().status).toBe('done')
    expect(actor.getSnapshot().value).toBe('abandoned')
  })

  it('ABANDON ends the task even mid-feedback', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })
    vi.advanceTimersByTime(SETTLE_MS)
    expect(actor.getSnapshot().value).toBe('graded')
    actor.send({ type: 'ABANDON' })
    expect(actor.getSnapshot().value).toBe('abandoned')
  })

  it('ABANDON output carries whatever partial stepResults were recorded so far', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({ type: 'SKIP_STEP' }) // records one result for s1
    actor.send({ type: 'ABANDON' })
    expect(actor.getSnapshot().output).toEqual({
      stepResults: [{ stepId: 's1', outcome: { type: 'skipped' } }],
    })
  })

  it('RESET restores initial context and returns to listening', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({ type: 'SKIP_STEP' })
    expect(actor.getSnapshot().context.currentStepIndex).toBe(1)

    actor.send({ type: 'RESET' })
    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toEqual({ listening: 'awaitingInput' })
    expect(snapshot.context.currentStepIndex).toBe(0)
    expect(snapshot.context.stepResults).toEqual([])
    expect(snapshot.context.lastEvaluation).toBeNull()
  })

  it('RESET works mid-feedback too', () => {
    const actor = startActor([STEP_1, STEP_2])
    actor.send({
      type: 'NOTES_CHANGED',
      heldNotes: new Set([midiNote(60), midiNote(64), midiNote(67)]),
    })
    vi.advanceTimersByTime(SETTLE_MS)
    expect(actor.getSnapshot().value).toBe('graded')

    actor.send({ type: 'RESET' })
    expect(actor.getSnapshot().value).toEqual({ listening: 'awaitingInput' })
    expect(actor.getSnapshot().context.currentStepIndex).toBe(0)
  })
})

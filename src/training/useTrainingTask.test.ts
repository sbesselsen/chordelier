import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTrainingTask } from './useTrainingTask'
import { heldNotesStore } from '../input/heldNotesStore'
import { midiNote, pitchClass } from '../theory/pitch'
import type { KeySignature } from '../theory/scale'
import type { TaskDefinition } from './taskSchema'

const SETTLE_MS = 600
const FEEDBACK_MS = 500
const SOURCE = 'test'

const TASK: TaskDefinition = {
  id: 'test-task',
  title: 'Test task',
  difficulty: 1,
  tags: [],
  defaultGradingMode: 'pitchClass',
  keyMode: 'fixed',
  fixedKey: { tonicPitchClass: pitchClass(0), scaleType: 'major' },
  steps: [
    { id: 's1', target: { kind: 'explicit', root: pitchClass(0), quality: 'maj' }, prompt: 'I' },
    { id: 's2', target: { kind: 'explicit', root: pitchClass(5), quality: 'maj' }, prompt: 'IV' },
  ],
}
const KEY: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'major' }

function playCMajor() {
  heldNotesStore.noteOn(midiNote(60), SOURCE)
  heldNotesStore.noteOn(midiNote(64), SOURCE)
  heldNotesStore.noteOn(midiNote(67), SOURCE)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  for (const note of [...heldNotesStore.getSnapshot()]) heldNotesStore.noteOff(note, SOURCE)
})

describe('useTrainingTask', () => {
  it('starts listening on the first step', () => {
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))
    expect(result.current.status).toBe('listening')
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.currentPrompt).toBe('I')
    expect(result.current.totalSteps).toBe(2)
  })

  it('grades a correct attempt and advances to the next step', () => {
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    expect(result.current.status).toBe('graded')
    expect(result.current.lastEvaluation?.result).toBe('correct')

    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    expect(result.current.status).toBe('listening')
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.currentPrompt).toBe('IV')
  })

  it('derives per-step display statuses as the task progresses', () => {
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))
    expect(result.current.stepStatuses).toEqual([
      { id: 's1', status: 'current' },
      { id: 's2', status: 'pending' },
    ])

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    expect(result.current.stepStatuses).toEqual([
      { id: 's1', status: 'correct' },
      { id: 's2', status: 'pending' },
    ])

    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    expect(result.current.stepStatuses).toEqual([
      { id: 's1', status: 'correct' },
      { id: 's2', status: 'current' },
    ])
  })

  it('re-seeds the new step from currently-held notes with no further physical input', () => {
    // Regression coverage for the useEffect dependency design: a step
    // transition must itself trigger a fresh evaluation even if heldNotes
    // hasn't changed since the previous step's grading, or the new step
    // would stall in awaitingInput forever whenever nothing changes hands.
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS))
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.status).toBe('listening')

    // Still holding C E G from step 1 — never touched anything for step 2.
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    expect(result.current.status).toBe('graded')
    expect(result.current.lastEvaluation?.result).toBe('incorrect') // F A C expected, C E G held
  })

  it('skip/abandon/reset drive the underlying machine', () => {
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))

    act(() => result.current.skip())
    expect(result.current.stepIndex).toBe(1)

    act(() => result.current.reset())
    expect(result.current.stepIndex).toBe(0)
    expect(result.current.status).toBe('listening')

    act(() => result.current.abandon())
    expect(result.current.status).toBe('abandoned')
  })

  it('reaches complete after the last step is graded', () => {
    const singleStepTask: TaskDefinition = { ...TASK, steps: [TASK.steps[0]!] }
    const { result } = renderHook(() => useTrainingTask(singleStepTask, KEY))

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS))
    expect(result.current.status).toBe('complete')
  })
})

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

  it('does not auto-grade the new step against notes resting unchanged from the previous step', () => {
    // Regression coverage: an earlier version re-sent NOTES_CHANGED on every
    // step transition even when heldNotes hadn't actually changed, so simply
    // resting on the just-graded chord for long enough silently graded the
    // *next* step against that stale input — reported as reproducing
    // immediately in real play. "No time pressure" requires the opposite:
    // nothing should happen until the player actually changes something.
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS))
    expect(result.current.stepIndex).toBe(1)
    expect(result.current.status).toBe('listening')

    // Still holding C E G from step 1 — never touched anything for step 2.
    // However long we wait, that must not get auto-graded.
    act(() => vi.advanceTimersByTime(SETTLE_MS * 5))
    expect(result.current.status).toBe('listening')
    expect(result.current.lastEvaluation).toBeNull()
  })

  it('grades the new step once the held notes actually change, even by one note', () => {
    const { result } = renderHook(() => useTrainingTask(TASK, KEY))

    act(() => playCMajor())
    act(() => vi.advanceTimersByTime(SETTLE_MS + FEEDBACK_MS))
    expect(result.current.stepIndex).toBe(1)

    // Move C -> F (common tones E, G held over), a genuine change.
    act(() => {
      heldNotesStore.noteOff(midiNote(60), SOURCE)
      heldNotesStore.noteOn(midiNote(65), SOURCE)
    })
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    expect(result.current.status).toBe('graded')
    expect(result.current.lastEvaluation?.result).toBe('incorrect') // F E G held, F A C expected
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

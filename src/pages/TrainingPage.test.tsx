import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TrainingPage } from './TrainingPage'
import { heldNotesStore } from '../input/heldNotesStore'
import { midiNote } from '../theory/pitch'

const SETTLE_MS = 600
const FEEDBACK_MS = 500
const SOURCE = 'test'

function play(...notes: number[]) {
  for (const note of notes) heldNotesStore.noteOn(midiNote(note), SOURCE)
}
function release(...notes: number[]) {
  for (const note of notes) heldNotesStore.noteOff(midiNote(note), SOURCE)
}

function startManualSession() {
  screen.getByRole('radio', { name: 'Manual' }).click()
  screen.getByRole('button', { name: 'Start' }).click()
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  for (const note of [...heldNotesStore.getSnapshot()]) heldNotesStore.noteOff(note, SOURCE)
})

describe('TrainingPage', () => {
  it('shows session setup first, with the selected task described', () => {
    render(<TrainingPage />)
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByText(/Roman numerals name a chord/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('shows a task intro before the first step, explaining the exercise', async () => {
    render(<TrainingPage />)
    await act(async () => startManualSession())

    expect(screen.getByRole('heading', { name: 'I – IV – vi – V' })).toBeInTheDocument()
    expect(screen.getByText(/Roman numerals name a chord/)).toBeInTheDocument()
    expect(screen.queryByText('Skip')).not.toBeInTheDocument() // not in the training view yet

    act(() => screen.getByRole('button', { name: 'Start playing' }).click())
    expect(screen.getByText('I')).toBeInTheDocument()
  })

  it('plays a full task in a manually chosen key through to the results summary', async () => {
    render(<TrainingPage />)
    await act(async () => startManualSession())
    act(() => screen.getByRole('button', { name: 'Start playing' }).click())

    // Step 1: I = C E G
    expect(screen.getByText('I')).toBeInTheDocument()
    act(() => play(60, 64, 67))
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    expect(screen.getByText('✓', { selector: '.training-task-view__result' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    act(() => release(60, 64, 67))

    // Step 2: IV = F A C
    expect(screen.getByText('IV')).toBeInTheDocument()
    act(() => play(65, 69, 60))
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    act(() => release(65, 69, 60))

    // Step 3: vi = A C E
    expect(screen.getByText('vi')).toBeInTheDocument()
    act(() => play(69, 60, 64))
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    act(() => release(69, 60, 64))

    // Step 4: V = G B D
    expect(screen.getByText('V')).toBeInTheDocument()
    act(() => play(67, 71, 62))
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    act(() => vi.advanceTimersByTime(FEEDBACK_MS))

    expect(screen.getByText('Nice work!')).toBeInTheDocument()
    expect(
      screen.getByText(/4 \/ 4 steps attempted — 4 correct, 0 close, 0 missed/),
    ).toBeInTheDocument()

    act(() => release(67, 71, 62))
  })

  it('"Play again" starts a fresh attempt without re-showing the intro', async () => {
    render(<TrainingPage />)
    await act(async () => startManualSession())
    act(() => screen.getByRole('button', { name: 'Start playing' }).click())

    act(() => play(60, 64, 67))
    act(() => vi.advanceTimersByTime(SETTLE_MS))
    act(() => vi.advanceTimersByTime(FEEDBACK_MS))
    act(() => release(60, 64, 67))
    act(() => screen.getByRole('button', { name: 'Skip' }).click())
    act(() => screen.getByRole('button', { name: 'Skip' }).click())
    act(() => screen.getByRole('button', { name: 'Skip' }).click())

    // Skipping the remaining steps still completes the task (doesn't abandon it).
    expect(screen.getByText('Nice work!')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Play again' }).click())
    expect(screen.getByText('I')).toBeInTheDocument() // straight back into step 1, no intro replay
  })

  it('"End session" mid-task returns to setup, and starting again re-shows the intro', async () => {
    render(<TrainingPage />)
    await act(async () => startManualSession())
    act(() => screen.getByRole('button', { name: 'Start playing' }).click())
    expect(screen.getByText('I')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'End session' }).click())
    expect(screen.getByText('Task')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()

    await act(async () => startManualSession())
    expect(screen.getByRole('heading', { name: 'I – IV – vi – V' })).toBeInTheDocument()
  })
})

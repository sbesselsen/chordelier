import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FreePlayPage } from './FreePlayPage'
import { heldNotesStore } from '../input/heldNotesStore'
import { midiNote } from '../theory/pitch'

const SOURCE = 'test'

afterEach(() => {
  for (const note of [...heldNotesStore.getSnapshot()]) heldNotesStore.noteOff(note, SOURCE)
})

describe('FreePlayPage', () => {
  it('renders the piano and an empty chord placeholder with no notes held', () => {
    render(<FreePlayPage />)
    expect(screen.getByText('Play something')).toBeInTheDocument()
  })

  it('shows the detected chord name when notes are played, with no runaway re-renders', () => {
    // React logs this to console.error rather than throwing — regression
    // guard for the bug where an unmemoized detectChord() call in the
    // render body fed a new object into useHeldChordDisplay's effect
    // dependency on every render, looping forever.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<FreePlayPage />)

    act(() => {
      heldNotesStore.noteOn(midiNote(60), SOURCE)
      heldNotesStore.noteOn(midiNote(64), SOURCE)
      heldNotesStore.noteOn(midiNote(67), SOURCE)
    })

    expect(screen.getByText('C')).toBeInTheDocument()
    for (const call of consoleError.mock.calls) {
      expect(call.join(' ')).not.toMatch(/Maximum update depth exceeded/)
    }

    consoleError.mockRestore()
  })
})

import { midiNote } from '../theory/pitch'
import { heldNotesStore } from './heldNotesStore'

/**
 * Dev-only note source that calls heldNotesStore the same way a mouse/QWERTY
 * input adapter would. Exists so Phase 1 can be tested deterministically
 * without MIDI hardware, and doubles as validation of the "swap the input
 * source" extensibility claim ahead of that adapter actually being built.
 */
const MOCK_SOURCE_ID = 'mock'

export function mockNoteOn(note: number): void {
  heldNotesStore.noteOn(midiNote(note), MOCK_SOURCE_ID)
}

export function mockNoteOff(note: number): void {
  heldNotesStore.noteOff(midiNote(note), MOCK_SOURCE_ID)
}

import { useSyncExternalStore } from 'react'
import type { MidiNoteNumber } from '../theory/pitch'
import { heldNotesStore } from './heldNotesStore'

export function useHeldNotes(): ReadonlySet<MidiNoteNumber> {
  return useSyncExternalStore(heldNotesStore.subscribe, heldNotesStore.getSnapshot)
}

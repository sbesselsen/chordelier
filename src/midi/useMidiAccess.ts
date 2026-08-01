import { useSyncExternalStore } from 'react'
import { midiAccessStore } from './MidiAccessStore'
import type { MidiAccessState } from './types'

export interface UseMidiAccessResult extends MidiAccessState {
  selectInput(id: string | null): void
}

export function useMidiAccess(): UseMidiAccessResult {
  const state = useSyncExternalStore(midiAccessStore.subscribe, midiAccessStore.getSnapshot)
  return { ...state, selectInput: midiAccessStore.selectInput }
}

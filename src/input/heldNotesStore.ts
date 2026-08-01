import type { MidiNoteNumber } from '../theory/pitch'

export type NoteSourceId = string

export interface HeldNotesStore {
  noteOn(note: MidiNoteNumber, sourceId: NoteSourceId): void
  noteOff(note: MidiNoteNumber, sourceId: NoteSourceId): void
  /** Releases every note held by this source (e.g. on MIDI device disconnect). */
  clearSource(sourceId: NoteSourceId): void
  getSnapshot(): ReadonlySet<MidiNoteNumber>
  subscribe(listener: () => void): () => void
}

/**
 * Source-agnostic "what pitches are currently down." Deliberately knows
 * nothing about MIDI — a mouse/QWERTY input adapter can call noteOn/noteOff
 * directly, which is exactly what src/input/mockNoteSource.ts does to
 * validate that seam ahead of it being built for real.
 *
 * A factory rather than module-level state, so tests aren't order-dependent
 * and React 18 StrictMode's double-mount doesn't corrupt shared state.
 */
export function createHeldNotesStore(): HeldNotesStore {
  // Map rather than a bare Set: a note can be held by more than one source
  // at once (e.g. mouse + MIDI on the same key), and clearSource must only
  // release notes that source itself was holding, not notes another source
  // still holds.
  const holders = new Map<MidiNoteNumber, Set<NoteSourceId>>()
  const listeners = new Set<() => void>()
  let snapshot: ReadonlySet<MidiNoteNumber> = new Set()

  function publish(): void {
    // Replace (not mutate) so useSyncExternalStore sees a new reference
    // exactly when the observable "held notes" output actually changed.
    snapshot = new Set(holders.keys())
    for (const listener of listeners) listener()
  }

  return {
    noteOn(note, sourceId) {
      const sources = holders.get(note)
      if (sources) {
        sources.add(sourceId) // no-op if already present; key set unchanged either way
        return
      }
      holders.set(note, new Set([sourceId]))
      publish()
    },
    noteOff(note, sourceId) {
      const sources = holders.get(note)
      if (!sources?.has(sourceId)) return
      sources.delete(sourceId)
      if (sources.size === 0) {
        holders.delete(note)
        publish()
      }
    },
    clearSource(sourceId) {
      let changed = false
      for (const [note, sources] of holders) {
        if (sources.delete(sourceId) && sources.size === 0) {
          holders.delete(note)
          changed = true
        }
      }
      if (changed) publish()
    },
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const heldNotesStore = createHeldNotesStore()

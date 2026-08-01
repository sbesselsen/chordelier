import { describe, expect, it, vi } from 'vitest'
import { createHeldNotesStore } from './heldNotesStore'
import { midiNote } from '../theory/pitch'

describe('heldNotesStore', () => {
  it('starts empty', () => {
    const store = createHeldNotesStore()
    expect(store.getSnapshot().size).toBe(0)
  })

  it('adds a note on noteOn and removes it on noteOff', () => {
    const store = createHeldNotesStore()
    store.noteOn(midiNote(60), 'device-1')
    expect([...store.getSnapshot()]).toEqual([60])
    store.noteOff(midiNote(60), 'device-1')
    expect(store.getSnapshot().size).toBe(0)
  })

  it('keeps a note held while any source still holds it', () => {
    const store = createHeldNotesStore()
    store.noteOn(midiNote(60), 'device-1')
    store.noteOn(midiNote(60), 'device-2')
    store.noteOff(midiNote(60), 'device-1')
    expect([...store.getSnapshot()]).toEqual([60]) // device-2 still holding
    store.noteOff(midiNote(60), 'device-2')
    expect(store.getSnapshot().size).toBe(0)
  })

  it('clearSource only releases notes held by that source', () => {
    const store = createHeldNotesStore()
    store.noteOn(midiNote(60), 'device-1')
    store.noteOn(midiNote(64), 'device-2')
    store.noteOn(midiNote(67), 'device-1')
    store.clearSource('device-1')
    expect([...store.getSnapshot()]).toEqual([64])
  })

  it('getSnapshot returns a stable reference until the held set actually changes', () => {
    const store = createHeldNotesStore()
    const before = store.getSnapshot()
    store.noteOn(midiNote(60), 'device-1')
    store.noteOn(midiNote(60), 'device-1') // duplicate noteOn, no-op
    const after = store.getSnapshot()
    expect(after).not.toBe(before)
    expect(store.getSnapshot()).toBe(after) // repeated reads without mutation stay stable
  })

  it('does not notify subscribers when a note-on/off is a no-op', () => {
    const store = createHeldNotesStore()
    store.noteOn(midiNote(60), 'device-1')
    const listener = vi.fn()
    store.subscribe(listener)
    store.noteOn(midiNote(60), 'device-1') // already held by this source
    store.noteOff(midiNote(64), 'device-1') // was never held
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies subscribers on real changes and supports unsubscribe', () => {
    const store = createHeldNotesStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.noteOn(midiNote(60), 'device-1')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.noteOn(midiNote(64), 'device-1')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

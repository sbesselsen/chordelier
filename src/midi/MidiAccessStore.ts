import { heldNotesStore } from '../input/heldNotesStore'
import { parseMidiMessage } from './parseMidiMessage'
import type { MidiAccessState, MidiDeviceInfo } from './types'

export interface MidiAccessStoreApi {
  getSnapshot(): MidiAccessState
  subscribe(listener: () => void): () => void
  selectInput(id: string | null): void
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator
}

function toDeviceInfo(port: MIDIInput): MidiDeviceInfo {
  return {
    id: port.id,
    name: port.name,
    manufacturer: port.manufacturer,
    connectionState: port.state,
  }
}

/**
 * Owns the raw Web MIDI API surface — nothing outside this module touches
 * `navigator.requestMIDIAccess`/`MIDIInput`/etc. Bridges chosen-input note
 * events into heldNotesStore (tagged with the device id as sourceId) and
 * exposes an external-store-compatible state snapshot for useMidiAccess.
 */
export function createMidiAccessStore(): MidiAccessStoreApi {
  let state: MidiAccessState = {
    supported: isSupported(),
    permission: 'unknown',
    inputs: [],
    selectedInputId: null,
    error: null,
  }
  const listeners = new Set<() => void>()
  let midiAccess: MIDIAccess | null = null
  let attachedInput: MIDIInput | null = null

  function publish(next: Partial<MidiAccessState>): void {
    state = { ...state, ...next }
    for (const listener of listeners) listener()
  }

  function currentInputs(): MidiDeviceInfo[] {
    if (!midiAccess) return []
    const list: MidiDeviceInfo[] = []
    midiAccess.inputs.forEach((input) => list.push(toDeviceInfo(input)))
    return list
  }

  function attachToSelected(): void {
    if (attachedInput) {
      attachedInput.onmidimessage = null
      attachedInput = null
    }
    if (!midiAccess || !state.selectedInputId) return
    const input = midiAccess.inputs.get(state.selectedInputId)
    if (!input) return

    input.onmidimessage = (event) => {
      if (!event.data) return
      const parsed = parseMidiMessage(event.data)
      if (parsed.type === 'noteon') heldNotesStore.noteOn(parsed.note, input.id)
      else if (parsed.type === 'noteoff') heldNotesStore.noteOff(parsed.note, input.id)
    }
    attachedInput = input
  }

  function handlePortStateChange(port: MIDIPort | null): void {
    if (port && port.type === 'input' && port.state === 'disconnected') {
      heldNotesStore.clearSource(port.id)
    }
    // Ids are stable across reconnects, so keep the current selection and
    // just re-attach — reconnecting the same device should resume working
    // without the user having to re-pick it from the dropdown.
    publish({ inputs: currentInputs() })
    attachToSelected()
  }

  async function init(): Promise<void> {
    if (!state.supported) {
      publish({ permission: 'denied', error: 'Web MIDI is not supported in this browser.' })
      return
    }

    try {
      const permissions = (navigator as Navigator & { permissions?: Permissions }).permissions
      const status = await permissions?.query({ name: 'midi' as PermissionName })
      if (status) {
        publish({ permission: status.state })
        status.onchange = () => publish({ permission: status.state })
      }
    } catch {
      // navigator.permissions.query({name:'midi'}) isn't supported everywhere;
      // requestMIDIAccess below is the authoritative outcome regardless.
    }

    try {
      midiAccess = await navigator.requestMIDIAccess()
      midiAccess.onstatechange = (event) => handlePortStateChange(event.port)
      publish({ permission: 'granted', inputs: currentInputs(), error: null })
    } catch (err) {
      publish({
        permission: 'denied',
        error: err instanceof Error ? err.message : 'MIDI access request failed.',
      })
    }
  }

  void init()

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    selectInput(id) {
      publish({ selectedInputId: id })
      attachToSelected()
    },
  }
}

export const midiAccessStore = createMidiAccessStore()

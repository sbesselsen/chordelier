import { type MidiNoteNumber, midiNote } from '../theory/pitch'

export type ParsedMidiEvent =
  | { type: 'noteon'; note: MidiNoteNumber; velocity: number; channel: number }
  | { type: 'noteoff'; note: MidiNoteNumber; channel: number }
  | { type: 'other' }

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

export function parseMidiMessage(data: Uint8Array): ParsedMidiEvent {
  const statusByte = data[0]
  const noteByte = data[1]
  const velocityByte = data[2]
  if (statusByte === undefined || noteByte === undefined) return { type: 'other' }

  const status = statusByte & 0xf0
  const channel = statusByte & 0x0f

  if (status === NOTE_ON && velocityByte !== undefined) {
    // A note-on with velocity 0 is conventionally sent as a note-off by real
    // controllers — treat it as one, or notes will stick.
    if (velocityByte === 0) return { type: 'noteoff', note: midiNote(noteByte), channel }
    return { type: 'noteon', note: midiNote(noteByte), velocity: velocityByte, channel }
  }
  if (status === NOTE_OFF) {
    return { type: 'noteoff', note: midiNote(noteByte), channel }
  }
  return { type: 'other' }
}

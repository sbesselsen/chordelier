import { describe, expect, it } from 'vitest'
import { parseMidiMessage } from './parseMidiMessage'

describe('parseMidiMessage', () => {
  it('parses a note-on message', () => {
    const result = parseMidiMessage(new Uint8Array([0x90, 60, 100]))
    expect(result).toEqual({ type: 'noteon', note: 60, velocity: 100, channel: 0 })
  })

  it('parses a note-off message', () => {
    const result = parseMidiMessage(new Uint8Array([0x80, 60, 0]))
    expect(result).toEqual({ type: 'noteoff', note: 60, channel: 0 })
  })

  it('treats a note-on with velocity 0 as a note-off', () => {
    const result = parseMidiMessage(new Uint8Array([0x90, 60, 0]))
    expect(result).toEqual({ type: 'noteoff', note: 60, channel: 0 })
  })

  it('extracts the MIDI channel from the status byte', () => {
    const result = parseMidiMessage(new Uint8Array([0x93, 60, 100])) // channel 4 (0-indexed 3)
    expect(result).toEqual({ type: 'noteon', note: 60, velocity: 100, channel: 3 })
  })

  it('treats other message types as other', () => {
    const controlChange = parseMidiMessage(new Uint8Array([0xb0, 64, 127]))
    expect(controlChange).toEqual({ type: 'other' })
  })

  it('treats truncated/empty data as other', () => {
    expect(parseMidiMessage(new Uint8Array([]))).toEqual({ type: 'other' })
    expect(parseMidiMessage(new Uint8Array([0x90]))).toEqual({ type: 'other' })
  })
})

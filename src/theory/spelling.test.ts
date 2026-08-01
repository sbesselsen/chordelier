import { describe, expect, it } from 'vitest'
import { detectChord } from './chordDetection'
import { formatChordName, noteName, pitchClassName } from './spelling'
import { midiNote, pitchClass } from './pitch'

describe('pitchClassName', () => {
  it('defaults to flats', () => {
    expect(pitchClassName(pitchClass(1))).toBe('D♭')
  })

  it('spells sharps when requested', () => {
    expect(pitchClassName(pitchClass(1), { preferSharp: true })).toBe('C♯')
  })
})

describe('noteName', () => {
  it('uses scientific pitch notation (middle C = C4)', () => {
    expect(noteName(midiNote(60))).toBe('C4')
    expect(noteName(midiNote(21))).toBe('A0')
    expect(noteName(midiNote(108))).toBe('C8')
  })
})

describe('formatChordName', () => {
  it('formats each detection status', () => {
    expect(formatChordName({ status: 'empty' })).toBe('')
    expect(formatChordName({ status: 'single', note: midiNote(60) })).toBe('C4')
    expect(formatChordName({ status: 'dyad', notes: [midiNote(60), midiNote(67)] })).toBe('C4 – G4')
    expect(
      formatChordName({
        status: 'unrecognized',
        notes: [midiNote(60), midiNote(61), midiNote(62)],
      }),
    ).toBe('No chord detected')
  })

  it('formats a root-position match with no bass suffix', () => {
    const result = detectChord(new Set([midiNote(60), midiNote(64), midiNote(67)]))
    expect(formatChordName(result)).toBe('C')
  })

  it('formats an inverted match with a bass suffix', () => {
    // C major, first inversion (E in the bass).
    const result = detectChord(new Set([midiNote(64), midiNote(67), midiNote(72)]))
    expect(formatChordName(result)).toBe('C / E')
  })

  it('respects the sharp/flat option for the whole name', () => {
    const result = detectChord(new Set([midiNote(61), midiNote(65), midiNote(68)])) // Db major
    expect(formatChordName(result)).toBe('D♭')
    expect(formatChordName(result, { preferSharp: true })).toBe('C♯')
  })
})

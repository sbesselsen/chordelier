import { describe, expect, it } from 'vitest'
import { lowestNote, midiNote, pitchClass, toPitchClass } from './pitch'

describe('pitchClass', () => {
  it('reduces MIDI notes to 0-11', () => {
    expect(pitchClass(60)).toBe(0) // C4
    expect(pitchClass(61)).toBe(1)
    expect(pitchClass(72)).toBe(0) // C5
  })

  it('wraps negative input correctly', () => {
    expect(pitchClass(-1)).toBe(11)
    expect(pitchClass(-13)).toBe(11)
  })
})

describe('toPitchClass', () => {
  it('matches pitchClass for branded notes', () => {
    expect(toPitchClass(midiNote(65))).toBe(5)
  })
})

describe('lowestNote', () => {
  it('returns null for an empty iterable', () => {
    expect(lowestNote([])).toBeNull()
  })

  it('returns the minimum note', () => {
    expect(lowestNote([midiNote(64), midiNote(60), midiNote(67)])).toBe(60)
  })
})

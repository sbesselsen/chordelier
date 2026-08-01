import { describe, expect, it } from 'vitest'
import { formatKeySignature } from './formatKeySignature'
import { pitchClass } from '../../theory/pitch'

describe('formatKeySignature', () => {
  it('formats a major key', () => {
    expect(formatKeySignature({ tonicPitchClass: pitchClass(0), scaleType: 'major' })).toBe(
      'C major',
    )
  })

  it('formats each minor scale type with a readable label', () => {
    expect(formatKeySignature({ tonicPitchClass: pitchClass(7), scaleType: 'naturalMinor' })).toBe(
      'G natural minor',
    )
    expect(formatKeySignature({ tonicPitchClass: pitchClass(9), scaleType: 'harmonicMinor' })).toBe(
      'A harmonic minor',
    )
    expect(formatKeySignature({ tonicPitchClass: pitchClass(2), scaleType: 'melodicMinor' })).toBe(
      'D melodic minor',
    )
  })
})

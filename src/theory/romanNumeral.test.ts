import { describe, expect, it } from 'vitest'
import { resolveRomanNumeral } from './romanNumeral'
import { pitchClass } from './pitch'
import type { KeySignature } from './scale'

const C_MAJOR: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'major' }

describe('resolveRomanNumeral', () => {
  it('resolves diatonic triads in C major', () => {
    expect(resolveRomanNumeral({ degree: 1, quality: 'maj' }, C_MAJOR)).toEqual({
      rootPitchClass: 0,
      pitchClasses: [0, 4, 7], // C major
    })
    expect(resolveRomanNumeral({ degree: 4, quality: 'maj' }, C_MAJOR)).toEqual({
      rootPitchClass: 5,
      pitchClasses: [5, 9, 0], // F major
    })
    expect(resolveRomanNumeral({ degree: 6, quality: 'min' }, C_MAJOR)).toEqual({
      rootPitchClass: 9,
      pitchClasses: [9, 0, 4], // A minor
    })
    expect(resolveRomanNumeral({ degree: 5, quality: 'maj' }, C_MAJOR)).toEqual({
      rootPitchClass: 7,
      pitchClasses: [7, 11, 2], // G major
    })
  })

  it('transposes correctly into a non-C key', () => {
    const dMajor: KeySignature = { tonicPitchClass: pitchClass(2), scaleType: 'major' }
    expect(resolveRomanNumeral({ degree: 1, quality: 'maj' }, dMajor).rootPitchClass).toBe(2)
    expect(resolveRomanNumeral({ degree: 4, quality: 'maj' }, dMajor).rootPitchClass).toBe(7) // G
    expect(resolveRomanNumeral({ degree: 5, quality: 'maj' }, dMajor).rootPitchClass).toBe(9) // A
  })

  it('resolves a secondary dominant (V7/ii) to A7 in C major', () => {
    const v7OfII = resolveRomanNumeral({ degree: 5, quality: 'dom7', applied: { of: 2 } }, C_MAJOR)
    expect(v7OfII.rootPitchClass).toBe(9) // A
    expect(v7OfII.pitchClasses).toEqual([9, 1, 4, 7]) // A C# E G
  })

  it('resolves the tonicized ii itself as a plain diatonic chord', () => {
    expect(resolveRomanNumeral({ degree: 2, quality: 'min7' }, C_MAJOR)).toEqual({
      rootPitchClass: 2,
      pitchClasses: [2, 5, 9, 0], // D F A C
    })
  })

  it('applies a chromatic borrowed-degree accidental', () => {
    // bVI in C major -> Ab major, borrowed from parallel minor.
    const flatSix = resolveRomanNumeral(
      { degree: 6, degreeAccidental: -1, quality: 'maj' },
      C_MAJOR,
    )
    expect(flatSix.rootPitchClass).toBe(8)
    expect(flatSix.pitchClasses).toEqual([8, 0, 3])
  })
})

import { describe, expect, it } from 'vitest'
import { scaleDegreeInterval } from './scale'

describe('scaleDegreeInterval', () => {
  it('resolves major scale degrees', () => {
    expect(scaleDegreeInterval('major', 1)).toBe(0)
    expect(scaleDegreeInterval('major', 3)).toBe(4)
    expect(scaleDegreeInterval('major', 5)).toBe(7)
    expect(scaleDegreeInterval('major', 7)).toBe(11)
  })

  it('resolves natural minor scale degrees', () => {
    expect(scaleDegreeInterval('naturalMinor', 3)).toBe(3)
    expect(scaleDegreeInterval('naturalMinor', 6)).toBe(8)
    expect(scaleDegreeInterval('naturalMinor', 7)).toBe(10)
  })

  it('agrees on the perfect fifth (degree 5) across every scale type', () => {
    // Load-bearing for secondary dominants: V-of-anything only works
    // correctly across modes because this interval never varies.
    expect(scaleDegreeInterval('major', 5)).toBe(7)
    expect(scaleDegreeInterval('naturalMinor', 5)).toBe(7)
    expect(scaleDegreeInterval('harmonicMinor', 5)).toBe(7)
    expect(scaleDegreeInterval('melodicMinor', 5)).toBe(7)
  })
})

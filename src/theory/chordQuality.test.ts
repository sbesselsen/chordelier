import { describe, expect, it } from 'vitest'
import {
  CHORD_QUALITIES,
  QUALITY_BY_INTERVAL_BITMASK,
  getChordQuality,
  rotateBitmask,
} from './chordQuality'
import { pitchClass } from './pitch'

describe('QUALITY_BY_INTERVAL_BITMASK', () => {
  it('has one entry per quality (no two v1 qualities share an interval pattern)', () => {
    expect(QUALITY_BY_INTERVAL_BITMASK.size).toBe(CHORD_QUALITIES.length)
    for (const qualities of QUALITY_BY_INTERVAL_BITMASK.values()) {
      expect(qualities).toHaveLength(1)
    }
  })
})

describe('getChordQuality', () => {
  it('looks up a known quality', () => {
    expect(getChordQuality('maj').intervals).toEqual([0, 4, 7])
  })
})

describe('rotateBitmask', () => {
  it('rotates a mask by the given root', () => {
    // C major triad mask (bits 0,4,7) rotated to root 4 (E) should read as
    // the "relative to E" pattern for a first-inversion C major, i.e. E's
    // own interval pattern seen from its own bit position.
    const cMajorMask = (1 << 0) | (1 << 4) | (1 << 7)
    const rotated = rotateBitmask(cMajorMask, pitchClass(4))
    // Relative to E: C is 8 semitones below E (i.e. +8 mod 12), E is 0, G is 3.
    expect(rotated).toBe((1 << 0) | (1 << 3) | (1 << 8))
  })

  it('rotating by 0 is a no-op', () => {
    const mask = (1 << 0) | (1 << 3) | (1 << 7)
    expect(rotateBitmask(mask, pitchClass(0))).toBe(mask)
  })
})

describe('pitch-class-set ambiguity across the full v1 table', () => {
  it('has exactly 91 distinct absolute pitch-class sets and 7 ambiguous ones', () => {
    const setsToOwners = new Map<number, Array<{ root: number; quality: string }>>()

    for (let root = 0; root < 12; root++) {
      for (const quality of CHORD_QUALITIES) {
        let mask = 0
        for (const interval of quality.intervals) mask |= 1 << ((root + interval) % 12)
        const owners = setsToOwners.get(mask) ?? []
        owners.push({ root, quality: quality.id })
        setsToOwners.set(mask, owners)
      }
    }

    expect(setsToOwners.size).toBe(91)
    const ambiguous = [...setsToOwners.values()].filter((owners) => owners.length > 1)
    expect(ambiguous).toHaveLength(7)
    for (const owners of ambiguous) {
      const qualities = new Set(owners.map((o) => o.quality))
      expect(qualities.size).toBe(1)
      expect(['aug', 'dim7']).toContain(owners[0]?.quality)
    }
  })
})

import type { PitchClass } from './pitch'

export interface ChordQualityDef {
  id: string
  intervals: readonly number[] // semitones from root, ascending, starting at 0
  symbolSuffix: string
  priority: number // tie-break weight for future ambiguous qualities (lower wins); inert while all v1 rows share 0
}

export const CHORD_QUALITIES = [
  { id: 'maj', intervals: [0, 4, 7], symbolSuffix: '', priority: 0 },
  { id: 'min', intervals: [0, 3, 7], symbolSuffix: 'm', priority: 0 },
  { id: 'dim', intervals: [0, 3, 6], symbolSuffix: '°', priority: 0 },
  { id: 'aug', intervals: [0, 4, 8], symbolSuffix: '+', priority: 0 },
  { id: 'maj7', intervals: [0, 4, 7, 11], symbolSuffix: 'maj7', priority: 0 },
  { id: 'min7', intervals: [0, 3, 7, 10], symbolSuffix: 'm7', priority: 0 },
  { id: 'dom7', intervals: [0, 4, 7, 10], symbolSuffix: '7', priority: 0 },
  { id: 'm7b5', intervals: [0, 3, 6, 10], symbolSuffix: 'm7♭5', priority: 0 },
  { id: 'dim7', intervals: [0, 3, 6, 9], symbolSuffix: '°7', priority: 0 },
] as const satisfies readonly ChordQualityDef[]

export type ChordQualityId = (typeof CHORD_QUALITIES)[number]['id']

export function getChordQuality(id: ChordQualityId): ChordQualityDef {
  const found = CHORD_QUALITIES.find((q) => q.id === id)
  if (!found) throw new Error(`Unknown chord quality id: ${id}`)
  return found
}

function intervalsToBitmask(intervals: readonly number[]): number {
  let mask = 0
  for (const interval of intervals) mask |= 1 << interval
  return mask
}

/**
 * Precomputed once at module load: interval-set bitmask (relative to an
 * assumed root of pitch class 0) -> every quality whose interval set
 * produces that exact bitmask. Lets chord detection replace a 12-root x
 * 9-quality scan with 12 O(1) map lookups, and collects every candidate
 * match rather than assuming the first is correct — required once future
 * qualities (sus, 6ths, etc.) reintroduce ambiguity beyond the two
 * symmetric v1 cases (augmented, diminished 7th).
 */
export const QUALITY_BY_INTERVAL_BITMASK: ReadonlyMap<number, readonly ChordQualityId[]> = (() => {
  const map = new Map<number, ChordQualityId[]>()
  for (const quality of CHORD_QUALITIES) {
    const mask = intervalsToBitmask(quality.intervals)
    const existing = map.get(mask)
    if (existing) existing.push(quality.id)
    else map.set(mask, [quality.id])
  }
  return map
})()

export function rotateBitmask(mask: number, root: PitchClass): number {
  const rotated = (mask >> root) | (mask << (12 - root))
  return rotated & 0xfff
}

import type { PitchClass } from './pitch'

export type ScaleType = 'major' | 'naturalMinor' | 'harmonicMinor' | 'melodicMinor'

export const SCALE_INTERVALS: Record<ScaleType, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  melodicMinor: [0, 2, 4, 5, 7, 9, 11],
}

export interface KeySignature {
  tonicPitchClass: PitchClass
  scaleType: ScaleType
}

export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7

export function scaleDegreeInterval(scaleType: ScaleType, degree: ScaleDegree): number {
  const interval = SCALE_INTERVALS[scaleType][degree - 1]
  if (interval === undefined) throw new Error(`Invalid scale degree: ${degree}`)
  return interval
}

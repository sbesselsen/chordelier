import { type ChordQualityId, getChordQuality } from './chordQuality'
import { type PitchClass, pitchClass } from './pitch'
import { type KeySignature, type ScaleDegree, scaleDegreeInterval } from './scale'

export interface RomanNumeralChord {
  degree: ScaleDegree
  /** Chromatic alteration of the degree itself, e.g. bVI. */
  degreeAccidental?: -1 | 0 | 1
  /**
   * Explicit rather than derived from the scale — this one choice is what
   * lets diatonic chords, secondary dominants, and borrowed chords share a
   * single resolver with no special-casing.
   */
  quality: ChordQualityId
  /** Secondary dominant/applied-chord support: tonicize another degree first. */
  applied?: { of: ScaleDegree; degreeAccidental?: -1 | 0 | 1 }
}

export interface ResolvedChord {
  rootPitchClass: PitchClass
  /** Full chord tones in root-position (ascending-from-root) order. */
  pitchClasses: readonly PitchClass[]
}

/**
 * Scale-degree arithmetic is intentionally reused as-is for the "local
 * tonic" of an applied/secondary-dominant chord — this only works because
 * degree 5's interval (a perfect fifth, 7 semitones) is identical across
 * all four ScaleType tables, so "V of any degree" resolves correctly
 * regardless of the main key's mode without extra logic.
 */
function localTonicPitchClass(
  key: KeySignature,
  applied: RomanNumeralChord['applied'],
): PitchClass {
  if (!applied) return key.tonicPitchClass
  return pitchClass(
    key.tonicPitchClass +
      scaleDegreeInterval(key.scaleType, applied.of) +
      (applied.degreeAccidental ?? 0),
  )
}

export function resolveRomanNumeralRoot(chord: RomanNumeralChord, key: KeySignature): PitchClass {
  const tonic = localTonicPitchClass(key, chord.applied)
  return pitchClass(
    tonic + scaleDegreeInterval(key.scaleType, chord.degree) + (chord.degreeAccidental ?? 0),
  )
}

export function resolveRomanNumeral(chord: RomanNumeralChord, key: KeySignature): ResolvedChord {
  const rootPitchClass = resolveRomanNumeralRoot(chord, key)
  const quality = getChordQuality(chord.quality)
  const pitchClasses = quality.intervals.map((interval) => pitchClass(rootPitchClass + interval))
  return { rootPitchClass, pitchClasses }
}

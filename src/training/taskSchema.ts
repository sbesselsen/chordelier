import type { ChordQualityId } from '../theory/chordQuality'
import type { PitchClass } from '../theory/pitch'
import type { RomanNumeralChord } from '../theory/romanNumeral'
import type { KeySignature } from '../theory/scale'

export type GradingMode = 'pitchClass' | 'exactVoicing'
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export type ChordTarget =
  | { kind: 'romanNumeral'; chord: RomanNumeralChord }
  | { kind: 'explicit'; root: PitchClass; quality: ChordQualityId; inversion?: number }
  | {
      kind: 'chromaticVoice'
      /** Reference chord for root/display purposes only — see targetIntervals. */
      base: RomanNumeralChord | { root: PitchClass; quality: ChordQualityId }
      /**
       * Full interval set (from the base's root) actually expected for this
       * step, in ascending order starting at 0. Replaces the base's own
       * intervals entirely rather than alterating individual chord tones by
       * index, so a step can add a voice the base chord never had (e.g. an
       * added 6th over a minor triad in a line cliché) — indexed
       * alterations into the base's own interval list can't express that.
       */
      targetIntervals: readonly number[]
    }

export interface TaskStep {
  id: string
  target: ChordTarget
  /** Falls back to the task's defaultGradingMode when omitted. */
  gradingMode?: GradingMode
  /** Index into the target's own ascending-from-root tone list; overrides the target's own inversion. Only enforced when gradingMode is 'exactVoicing'. */
  requiredInversion?: number
  prompt?: string
}

export interface TaskDefinition {
  id: string
  title: string
  description?: string
  difficulty: DifficultyLevel
  tags: readonly string[]
  defaultGradingMode: GradingMode
  keyMode: 'fixed' | 'randomize'
  fixedKey?: KeySignature
  steps: readonly TaskStep[]
}

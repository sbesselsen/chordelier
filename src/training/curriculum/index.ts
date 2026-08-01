import type { KeySignature } from '../../theory/scale'
import { pitchClass } from '../../theory/pitch'
import type { DifficultyLevel, TaskDefinition } from '../taskSchema'

/**
 * One fixture task per confirmed difficulty tier, written in Phase 2 to
 * stress-test the task schema before Phases 3-4 are built on top of it (see
 * the Phase 2 plan note on this). Phase 5 extends this registry to full
 * per-tier coverage — same shape, more entries, not a restructure.
 */

const tier1RootPositionTriads: TaskDefinition = {
  id: 'diatonic-I-IV-vi-V',
  title: 'I – IV – vi – V',
  description:
    'The most common pop progression, root position. Roman numerals name a chord by its scale degree in the current key — uppercase for major, lowercase for minor. I is the tonic (1st degree), IV the subdominant (4th), vi the relative minor (6th), and V the dominant (5th). Play each in root position, any voicing.',
  difficulty: 1,
  tags: ['diatonic', 'triads'],
  defaultGradingMode: 'pitchClass',
  keyMode: 'randomize',
  steps: [
    {
      id: 's1',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'maj' } },
      prompt: 'I',
    },
    {
      id: 's2',
      target: { kind: 'romanNumeral', chord: { degree: 4, quality: 'maj' } },
      prompt: 'IV',
    },
    {
      id: 's3',
      target: { kind: 'romanNumeral', chord: { degree: 6, quality: 'min' } },
      prompt: 'vi',
    },
    {
      id: 's4',
      target: { kind: 'romanNumeral', chord: { degree: 5, quality: 'maj' } },
      prompt: 'V',
    },
  ],
}

const tier2TriadInversions: TaskDefinition = {
  id: 'tonic-triad-inversions',
  title: 'Tonic triad through its inversions',
  description:
    'An inversion changes which chord tone sits in the bass (the lowest note) without changing the chord itself. Root position has the root in the bass; first inversion has the 3rd in the bass; second inversion has the 5th in the bass. Play the tonic triad (I) through all three, in a randomized key.',
  difficulty: 2,
  tags: ['diatonic', 'triads', 'inversions'],
  defaultGradingMode: 'exactVoicing',
  keyMode: 'randomize',
  steps: [
    {
      id: 's1',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'maj' } },
      requiredInversion: 0,
      prompt: 'I (root position)',
    },
    {
      id: 's2',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'maj' } },
      requiredInversion: 1,
      prompt: 'I (1st inversion)',
    },
    {
      id: 's3',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'maj' } },
      requiredInversion: 2,
      prompt: 'I (2nd inversion)',
    },
  ],
}

const tier3DiatonicSevenths: TaskDefinition = {
  id: 'ii-V-I-sevenths',
  title: 'ii7 – V7 – Imaj7',
  description:
    "The core jazz cadence, with 7th chords throughout. A number after a roman numeral means add the 7th on top of the triad. ii7 and V7 are the diatonic minor-7th and dominant-7th chords; Imaj7 keeps the tonic's major quality but adds a major 7th ('maj7', to distinguish it from a dominant 7th).",
  difficulty: 3,
  tags: ['diatonic', 'seventh-chords'],
  defaultGradingMode: 'pitchClass',
  keyMode: 'randomize',
  steps: [
    {
      id: 's1',
      target: { kind: 'romanNumeral', chord: { degree: 2, quality: 'min7' } },
      prompt: 'ii7',
    },
    {
      id: 's2',
      target: { kind: 'romanNumeral', chord: { degree: 5, quality: 'dom7' } },
      prompt: 'V7',
    },
    {
      id: 's3',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'maj7' } },
      prompt: 'Imaj7',
    },
  ],
}

const tier4SecondaryDominant: TaskDefinition = {
  id: 'secondary-dominant-to-ii',
  title: 'ii via its secondary dominant',
  description:
    'A secondary dominant borrows the "V7 resolves down a 5th" idea and applies it to a chord other than the tonic. V7/ii ("five-seven of two") means: build a dominant 7th chord a perfect 5th above ii — exactly like you\'d build V7 above the real tonic — then resolve it down to ii, the same way V7 normally resolves to I. This briefly makes ii feel like its own temporary tonic. You\'ll play V7/ii first, then resolve to ii itself.',
  difficulty: 4,
  tags: ['secondary-dominant'],
  defaultGradingMode: 'pitchClass',
  keyMode: 'randomize',
  steps: [
    {
      id: 's1',
      target: { kind: 'romanNumeral', chord: { degree: 5, quality: 'dom7', applied: { of: 2 } } },
      prompt: 'V7/ii',
    },
    {
      id: 's2',
      target: { kind: 'romanNumeral', chord: { degree: 2, quality: 'min' } },
      prompt: 'ii',
    },
  ],
}

const C_NATURAL_MINOR: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'naturalMinor' }

const tier5LineCliche: TaskDefinition = {
  id: 'line-cliche-rising-to-V',
  title: 'Line cliché rising to the dominant',
  description:
    'Hold the minor tonic triad (i) while one inner voice climbs by half steps: the 5th rises to a sharp 5 (i(♯5), an augmented triad), then a further half step to form an added 6th (i(6)) — the root and 3rd stay put throughout. Finally resolve to V7. This is graded on exact voicing: the moving note has to be in the correct voice, not just the right pitch classes in any octave.',
  difficulty: 5,
  tags: ['voice-leading', 'chromatic'],
  defaultGradingMode: 'exactVoicing',
  keyMode: 'fixed',
  fixedKey: C_NATURAL_MINOR,
  steps: [
    {
      id: 's1',
      target: { kind: 'romanNumeral', chord: { degree: 1, quality: 'min' } },
      requiredInversion: 0,
      prompt: 'i',
    },
    {
      id: 's2',
      target: {
        kind: 'chromaticVoice',
        base: { degree: 1, quality: 'min' },
        targetIntervals: [0, 3, 8], // 5th raised a semitone
      },
      prompt: 'i (♯5)',
    },
    {
      id: 's3',
      target: {
        kind: 'chromaticVoice',
        base: { degree: 1, quality: 'min' },
        targetIntervals: [0, 3, 9], // 5th raised a further semitone (added 6th)
      },
      prompt: 'i (6)',
    },
    {
      id: 's4',
      target: { kind: 'romanNumeral', chord: { degree: 5, quality: 'dom7' } },
      requiredInversion: 0,
      prompt: 'V7',
    },
  ],
}

export const CURRICULUM: readonly TaskDefinition[] = [
  tier1RootPositionTriads,
  tier2TriadInversions,
  tier3DiatonicSevenths,
  tier4SecondaryDominant,
  tier5LineCliche,
]

export function getTaskById(id: string): TaskDefinition | undefined {
  return CURRICULUM.find((task) => task.id === id)
}

export function getTasksByDifficulty(difficulty: DifficultyLevel): TaskDefinition[] {
  return CURRICULUM.filter((task) => task.difficulty === difficulty)
}

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
  description: 'The most common pop progression, root position.',
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
  description: 'Play I in root position, then first inversion, then second inversion.',
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
  description: 'The core jazz cadence, with 7th chords throughout.',
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
  description: 'Tonicize ii with its own dominant 7th before resolving.',
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
      target: { kind: 'romanNumeral', chord: { degree: 2, quality: 'min7' } },
      prompt: 'ii',
    },
  ],
}

const C_NATURAL_MINOR: KeySignature = { tonicPitchClass: pitchClass(0), scaleType: 'naturalMinor' }

const tier5LineCliche: TaskDefinition = {
  id: 'line-cliche-rising-to-V',
  title: 'Line cliché rising to the dominant',
  description: 'A chromatic inner-voice line over a held tonic, resolving to V7.',
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

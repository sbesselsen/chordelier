import type { ChordDetectionResult } from './chordDetection'
import { getChordQuality } from './chordQuality'
import type { MidiNoteNumber, PitchClass } from './pitch'

const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const
const NOTE_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const

export interface SpellingOptions {
  /** Free-play (no active session key) defaults to flats per confirmed product decision. */
  preferSharp?: boolean
}

export function pitchClassName(pc: PitchClass, options: SpellingOptions = {}): string {
  const names = options.preferSharp ? NOTE_NAMES_SHARP : NOTE_NAMES_FLAT
  return names[pc] ?? names[0]
}

export function noteName(note: MidiNoteNumber, options: SpellingOptions = {}): string {
  const pc = (((note % 12) + 12) % 12) as PitchClass
  const octave = Math.floor(note / 12) - 1
  return `${pitchClassName(pc, options)}${octave}`
}

export function formatChordName(
  result: ChordDetectionResult,
  options: SpellingOptions = {},
): string {
  switch (result.status) {
    case 'empty':
      return ''
    case 'single':
      return noteName(result.note, options)
    case 'dyad':
      return result.notes.map((n) => noteName(n, options)).join(' – ')
    case 'unrecognized':
      return 'No chord detected'
    case 'match': {
      const quality = getChordQuality(result.quality)
      const name = `${pitchClassName(result.root, options)}${quality.symbolSuffix}`
      if (result.inversion === 0) return name
      return `${name} / ${pitchClassName(result.bassPitchClass, options)}`
    }
  }
}

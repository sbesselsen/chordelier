import {
  type ChordQualityId,
  QUALITY_BY_INTERVAL_BITMASK,
  getChordQuality,
  rotateBitmask,
} from './chordQuality'
import { type MidiNoteNumber, type PitchClass, lowestNote, pitchClass, toPitchClass } from './pitch'

export type ChordDetectionResult =
  | { status: 'empty' }
  | { status: 'single'; note: MidiNoteNumber }
  | { status: 'dyad'; notes: readonly [MidiNoteNumber, MidiNoteNumber] }
  | { status: 'unrecognized'; notes: readonly MidiNoteNumber[] }
  | {
      status: 'match'
      root: PitchClass
      quality: ChordQualityId
      bassPitchClass: PitchClass
      inversion: number
      notes: readonly MidiNoteNumber[]
      alternateReadings: readonly { root: PitchClass; quality: ChordQualityId }[]
    }

interface Candidate {
  root: PitchClass
  quality: ChordQualityId
}

function findCandidates(heldPitchClasses: ReadonlySet<PitchClass>): Candidate[] {
  let heldMask = 0
  for (const pc of heldPitchClasses) heldMask |= 1 << pc

  const candidates: Candidate[] = []
  for (let root = 0; root < 12; root++) {
    const relativeMask = rotateBitmask(heldMask, pitchClass(root))
    const qualities = QUALITY_BY_INTERVAL_BITMASK.get(relativeMask)
    if (!qualities) continue
    for (const quality of qualities) candidates.push({ root: pitchClass(root), quality })
  }
  return candidates
}

/**
 * Tie-break chain for when more than one candidate matches the held pitch
 * classes (in v1, only the augmented triad and diminished-7th cases, which
 * this always resolves via rule 1 — the bass pitch class is guaranteed to be
 * one of the candidate roots for both). Kept as a chain rather than a single
 * rule so future, less-symmetric ambiguity (sus2/sus4, added 6ths, etc.) has
 * somewhere to plug in without changing detectChord's shape.
 */
function pickBestCandidate(
  candidates: readonly Candidate[],
  bassPitchClass: PitchClass,
): Candidate {
  const first = candidates[0]
  if (!first) throw new Error('pickBestCandidate requires at least one candidate')
  if (candidates.length === 1) return first

  const bassMatch = candidates.find((c) => c.root === bassPitchClass)
  if (bassMatch) return bassMatch

  const sorted = [...candidates].sort((a, b) => {
    const priorityDiff = getChordQuality(a.quality).priority - getChordQuality(b.quality).priority
    if (priorityDiff !== 0) return priorityDiff
    return a.root - b.root
  })
  const best = sorted[0]
  if (!best) throw new Error('pickBestCandidate requires at least one candidate')
  return best
}

export function detectChord(heldNotes: ReadonlySet<MidiNoteNumber>): ChordDetectionResult {
  const notes = [...heldNotes]

  if (notes.length === 0) return { status: 'empty' }
  if (notes.length === 1) {
    const note = notes[0]
    if (note === undefined) return { status: 'empty' }
    return { status: 'single', note }
  }
  if (notes.length === 2) {
    const [a, b] = notes
    if (a === undefined || b === undefined) return { status: 'empty' }
    return { status: 'dyad', notes: [a, b] }
  }

  const heldPitchClasses = new Set(notes.map(toPitchClass))
  const candidates = findCandidates(heldPitchClasses)

  if (candidates.length === 0) return { status: 'unrecognized', notes }

  const bass = lowestNote(heldNotes)
  if (bass === null) return { status: 'unrecognized', notes }
  const bassPitchClass = toPitchClass(bass)

  const best = pickBestCandidate(candidates, bassPitchClass)
  const qualityDef = getChordQuality(best.quality)
  const bassInterval = pitchClass(bassPitchClass - best.root)
  const inversion = qualityDef.intervals.indexOf(bassInterval)

  const alternateReadings = candidates
    .filter((c) => c.root !== best.root || c.quality !== best.quality)
    .map((c) => ({ root: c.root, quality: c.quality }))

  return {
    status: 'match',
    root: best.root,
    quality: best.quality,
    bassPitchClass,
    inversion: inversion === -1 ? 0 : inversion,
    notes,
    alternateReadings,
  }
}

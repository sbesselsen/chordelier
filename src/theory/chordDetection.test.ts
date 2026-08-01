import { describe, expect, it } from 'vitest'
import { CHORD_QUALITIES, type ChordQualityId } from './chordQuality'
import { detectChord } from './chordDetection'
import { midiNote, pitchClass } from './pitch'

const SYMMETRIC_QUALITIES = new Set<ChordQualityId>(['aug', 'dim7'])

/**
 * Builds a voicing where the given root/quality's chord tone at
 * `inversionIndex` is the bass (lowest note held), and every other chord
 * tone sits somewhere above it. Absolute octave placement of the upper
 * voices doesn't matter for root/quality detection — only which pitch class
 * is lowest does.
 */
function buildVoicing(
  root: number,
  intervals: readonly number[],
  inversionIndex: number,
): number[] {
  const bassPc = (root + (intervals[inversionIndex] ?? 0)) % 12
  const bassNote = 48 + bassPc
  return intervals.map((interval) => {
    const pc = (root + interval) % 12
    if (pc === bassPc) return bassNote
    return bassNote + ((((pc - bassPc) % 12) + 12) % 12)
  })
}

describe('detectChord — trivial note counts', () => {
  it('reports empty for no held notes', () => {
    expect(detectChord(new Set())).toEqual({ status: 'empty' })
  })

  it('reports single for one held note', () => {
    const result = detectChord(new Set([midiNote(60)]))
    expect(result).toEqual({ status: 'single', note: 60 })
  })

  it('reports dyad for two held notes', () => {
    const result = detectChord(new Set([midiNote(60), midiNote(67)]))
    expect(result).toEqual({ status: 'dyad', notes: [60, 67] })
  })

  it('reports unrecognized for a non-chord cluster', () => {
    const result = detectChord(new Set([midiNote(60), midiNote(61), midiNote(62)]))
    expect(result.status).toBe('unrecognized')
  })
})

describe('detectChord — exhaustive quality x root x inversion', () => {
  for (const quality of CHORD_QUALITIES) {
    for (let root = 0; root < 12; root++) {
      for (let inversionIndex = 0; inversionIndex < quality.intervals.length; inversionIndex++) {
        it(`${quality.id} rooted at pc ${root}, inversion ${inversionIndex}`, () => {
          const voicing = buildVoicing(root, quality.intervals, inversionIndex)
          const result = detectChord(new Set(voicing.map(midiNote)))

          expect(result.status).toBe('match')
          if (result.status !== 'match') return

          expect(result.quality).toBe(quality.id)

          if (SYMMETRIC_QUALITIES.has(quality.id)) {
            // No canonical root by pitch content alone — detection must
            // default to reading the bass pitch class as the root, which
            // means the reported inversion is always 0.
            const bassPc = (root + (quality.intervals[inversionIndex] ?? 0)) % 12
            expect(result.root).toBe(bassPc)
            expect(result.bassPitchClass).toBe(bassPc)
            expect(result.inversion).toBe(0)
            expect(result.alternateReadings.length).toBeGreaterThan(0)
          } else {
            expect(result.root).toBe(pitchClass(root))
            expect(result.inversion).toBe(inversionIndex)
            expect(result.alternateReadings).toEqual([])
          }
        })
      }
    }
  }
})

describe('detectChord — symmetric-chord bass tie-break', () => {
  it('reads an augmented triad rooted at whichever note is in the bass', () => {
    // C E G# with C in the bass -> read as C+.
    const cBass = detectChord(new Set([midiNote(60), midiNote(64), midiNote(68)]))
    expect(cBass).toMatchObject({ status: 'match', quality: 'aug', root: 0 })

    // Same pitch classes, E in the bass -> read as E+.
    const eBass = detectChord(new Set([midiNote(64), midiNote(68), midiNote(72)]))
    expect(eBass).toMatchObject({ status: 'match', quality: 'aug', root: 4 })
  })

  it('reads a diminished 7th rooted at whichever note is in the bass', () => {
    const cBass = detectChord(new Set([midiNote(60), midiNote(63), midiNote(66), midiNote(69)]))
    expect(cBass).toMatchObject({ status: 'match', quality: 'dim7', root: 0 })

    const ebBass = detectChord(new Set([midiNote(63), midiNote(66), midiNote(69), midiNote(72)]))
    expect(ebBass).toMatchObject({ status: 'match', quality: 'dim7', root: 3 })
  })
})

describe('detectChord — doublings and extra octaves', () => {
  it('ignores octave doublings of chord tones', () => {
    // C major triad with a doubled root an octave up.
    const result = detectChord(new Set([midiNote(48), midiNote(52), midiNote(55), midiNote(60)]))
    expect(result).toMatchObject({ status: 'match', quality: 'maj', root: 0, inversion: 0 })
  })

  it('does not misread a 7th chord as its triad subset', () => {
    const cMaj7 = detectChord(new Set([midiNote(60), midiNote(64), midiNote(67), midiNote(71)]))
    expect(cMaj7).toMatchObject({ status: 'match', quality: 'maj7' })
  })
})

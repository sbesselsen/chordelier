/**
 * Core numeric primitives for the theory/training layers. Branded rather than
 * plain `number` because the domain revolves around converting one to the
 * other (`note % 12`), and passing a raw MIDI note where a pitch class is
 * expected is the most likely bug class here.
 */
export type MidiNoteNumber = number & { readonly __brand: 'MidiNoteNumber' }
export type PitchClass = number & { readonly __brand: 'PitchClass' }

export function midiNote(n: number): MidiNoteNumber {
  return n as MidiNoteNumber
}

export function pitchClass(n: number): PitchClass {
  return (((n % 12) + 12) % 12) as PitchClass
}

export function toPitchClass(note: MidiNoteNumber): PitchClass {
  return pitchClass(note)
}

export function lowestNote(notes: Iterable<MidiNoteNumber>): MidiNoteNumber | null {
  let min: MidiNoteNumber | null = null
  for (const note of notes) {
    if (min === null || note < min) min = note
  }
  return min
}

import type { KeySignature } from '../../theory/scale'
import { pitchClassName } from '../../theory/spelling'

const SCALE_TYPE_LABEL: Record<KeySignature['scaleType'], string> = {
  major: 'major',
  naturalMinor: 'natural minor',
  harmonicMinor: 'harmonic minor',
  melodicMinor: 'melodic minor',
}

export function formatKeySignature(key: KeySignature): string {
  return `${pitchClassName(key.tonicPitchClass)} ${SCALE_TYPE_LABEL[key.scaleType]}`
}

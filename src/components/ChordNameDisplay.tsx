import type { ChordDetectionResult } from '../theory/chordDetection'
import { formatChordName } from '../theory/spelling'

export interface ChordNameDisplayProps {
  result: ChordDetectionResult
}

export function ChordNameDisplay({ result }: ChordNameDisplayProps) {
  const name = formatChordName(result)
  const isPlaceholder = result.status === 'empty'

  return (
    <div className="chord-name-display" aria-live="polite">
      {isPlaceholder ? (
        <span className="chord-name-display__placeholder">Play something</span>
      ) : (
        name
      )}
    </div>
  )
}

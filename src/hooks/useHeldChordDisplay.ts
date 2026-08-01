import { useEffect, useRef, useState } from 'react'
import type { ChordDetectionResult } from '../theory/chordDetection'

const HOLD_MS = 120

/**
 * Rolled/arpeggiated chords otherwise flash through single -> dyad ->
 * "unrecognized" -> the actual chord as notes land one at a time. Holds the
 * last recognized chord on screen briefly before falling back to a less
 * informative status, so free play doesn't flicker on every arpeggio.
 */
export function useHeldChordDisplay(result: ChordDetectionResult): ChordDetectionResult {
  const [displayed, setDisplayed] = useState(result)
  const displayedStatusRef = useRef(result.status)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const isDowngradeFromMatch = displayedStatusRef.current === 'match' && result.status !== 'match'
    if (!isDowngradeFromMatch) {
      displayedStatusRef.current = result.status
      setDisplayed(result)
      return
    }

    timeoutRef.current = setTimeout(() => {
      displayedStatusRef.current = result.status
      setDisplayed(result)
    }, HOLD_MS)
  }, [result])

  return displayed
}

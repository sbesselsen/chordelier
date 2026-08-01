import { memo } from 'react'

export interface PianoKeyProps {
  isHeld: boolean
  isBlack: boolean
}

function PianoKeyImpl({ isHeld, isBlack }: PianoKeyProps) {
  return (
    <div
      className={`piano-key ${isBlack ? 'piano-key--black' : 'piano-key--white'} ${isHeld ? 'piano-key--held' : ''}`}
    />
  )
}

export const PianoKey = memo(PianoKeyImpl)

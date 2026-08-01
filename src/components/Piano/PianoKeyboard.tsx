import { useMemo } from 'react'
import { type MidiNoteNumber, midiNote } from '../../theory/pitch'
import { PianoKey } from './PianoKey'
import './piano.css'

export interface PianoKeyboardProps {
  heldNotes: ReadonlySet<MidiNoteNumber>
  lowestNote?: number
  highestNote?: number
}

const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11])

interface KeyLayout {
  note: MidiNoteNumber
  isBlack: boolean
  /** Index of the white key immediately to this key's left (its own index, for white keys). */
  whiteIndex: number
}

function buildLayout(lowest: number, highest: number): KeyLayout[] {
  const layout: KeyLayout[] = []
  let whiteIndex = -1
  for (let n = lowest; n <= highest; n++) {
    const pc = ((n % 12) + 12) % 12
    const isBlack = !WHITE_PITCH_CLASSES.has(pc)
    if (!isBlack) whiteIndex++
    layout.push({ note: midiNote(n), isBlack, whiteIndex })
  }
  return layout
}

type KeyboardCssVars = React.CSSProperties & { '--white-key-count': number }
type BlackKeyCssVars = React.CSSProperties & { '--white-index': number }

export function PianoKeyboard({
  heldNotes,
  lowestNote = 21,
  highestNote = 108,
}: PianoKeyboardProps) {
  const layout = useMemo(() => buildLayout(lowestNote, highestNote), [lowestNote, highestNote])
  const whiteKeys = layout.filter((k) => !k.isBlack)
  const blackKeys = layout.filter((k) => k.isBlack)

  const keyboardStyle: KeyboardCssVars = { '--white-key-count': whiteKeys.length }

  return (
    <div className="piano-keyboard" style={keyboardStyle}>
      <div className="piano-keyboard__white-row">
        {whiteKeys.map((k) => (
          <PianoKey key={k.note} isHeld={heldNotes.has(k.note)} isBlack={false} />
        ))}
      </div>
      <div className="piano-keyboard__black-row">
        {blackKeys.map((k) => {
          const blackKeyStyle: BlackKeyCssVars = { '--white-index': k.whiteIndex + 1 }
          return (
            <div key={k.note} className="piano-keyboard__black-slot" style={blackKeyStyle}>
              <PianoKey isHeld={heldNotes.has(k.note)} isBlack={true} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

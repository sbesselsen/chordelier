export interface DevMockKeyboardProps {
  notes: readonly number[]
  onNoteOn: (note: number) => void
  onNoteOff: (note: number) => void
}

/**
 * Dev-only input panel — fires note on/off the same way a mouse-piano
 * adapter would, so Phase 1 is testable without MIDI hardware. Kept
 * presentational (callbacks as props); FreePlayPage wires it to
 * input/mockNoteSource and only renders it in dev builds.
 */
export function DevMockKeyboard({ notes, onNoteOn, onNoteOff }: DevMockKeyboardProps) {
  return (
    <div className="dev-mock-keyboard">
      <span className="dev-mock-keyboard__label">Dev mock input (no MIDI device needed)</span>
      <div className="dev-mock-keyboard__keys">
        {notes.map((note) => (
          <button
            key={note}
            type="button"
            className="dev-mock-keyboard__key"
            onMouseDown={() => onNoteOn(note)}
            onMouseUp={() => onNoteOff(note)}
            onMouseLeave={() => onNoteOff(note)}
          >
            {note}
          </button>
        ))}
      </div>
    </div>
  )
}

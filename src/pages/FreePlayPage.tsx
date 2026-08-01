import { useMemo } from 'react'
import { ChordNameDisplay } from '../components/ChordNameDisplay'
import { DevMockKeyboard } from '../components/DevMockKeyboard'
import { MidiDeviceSelector } from '../components/MidiDeviceSelector'
import { PianoKeyboard } from '../components/Piano/PianoKeyboard'
import { useHeldChordDisplay } from '../hooks/useHeldChordDisplay'
import { useHeldNotes } from '../input/useHeldNotes'
import { mockNoteOff, mockNoteOn } from '../input/mockNoteSource'
import { useMidiAccess } from '../midi/useMidiAccess'
import { detectChord } from '../theory/chordDetection'

// C4 major scale — enough range to exercise a handful of triads/7ths manually.
const MOCK_NOTES = [60, 62, 64, 65, 67, 69, 71, 72]

export function FreePlayPage() {
  const heldNotes = useHeldNotes()
  const midi = useMidiAccess()
  // heldNotesStore only hands out a new heldNotes reference when the held
  // set actually changes, so keying the memo on it (rather than calling
  // detectChord directly in the render body) keeps the detection result
  // reference-stable across unrelated re-renders — required by
  // useHeldChordDisplay's effect dependency, or it loops forever.
  const rawDetection = useMemo(() => detectChord(heldNotes), [heldNotes])
  const detection = useHeldChordDisplay(rawDetection)

  return (
    <div className="free-play-page">
      <div className="free-play-page__controls">
        <MidiDeviceSelector
          devices={midi.inputs}
          selectedId={midi.selectedInputId}
          onSelect={midi.selectInput}
        />
        {!midi.supported && (
          <p className="free-play-page__status" role="status">
            Web MIDI isn't supported in this browser. Try Chrome or Edge on desktop.
          </p>
        )}
        {midi.supported && midi.permission === 'denied' && (
          <p className="free-play-page__status" role="status">
            MIDI access was denied{midi.error ? `: ${midi.error}` : '.'}
          </p>
        )}
      </div>

      <ChordNameDisplay result={detection} />
      <PianoKeyboard heldNotes={heldNotes} />

      {import.meta.env.DEV && (
        <DevMockKeyboard notes={MOCK_NOTES} onNoteOn={mockNoteOn} onNoteOff={mockNoteOff} />
      )}
    </div>
  )
}

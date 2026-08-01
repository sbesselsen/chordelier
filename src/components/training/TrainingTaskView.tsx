import { PianoKeyboard } from '../Piano/PianoKeyboard'
import type { ChordDetectionResult } from '../../theory/chordDetection'
import type { MidiNoteNumber } from '../../theory/pitch'
import type { KeySignature } from '../../theory/scale'
import { formatChordName } from '../../theory/spelling'
import type { StepEvaluation } from '../../training/grading'
import type { TrainingTaskStatus } from '../../training/useTrainingTask'
import { formatEvaluationDiagnostics } from './formatEvaluation'
import { formatKeySignature } from './formatKeySignature'
import { STEP_STATUS_SYMBOL } from './resultSymbols'

export interface TrainingTaskViewProps {
  /** Shown throughout the exercise — matters most for a randomized key, since you otherwise have no way to know what it landed on. */
  sessionKey: KeySignature
  /** The instruction to play (e.g. "V7/ii") — never the resolved chord name/notes, so the task stays a recall exercise rather than a follow-along. */
  prompt?: string
  heldNotes: ReadonlySet<MidiNoteNumber>
  /** Live recognition of whatever's currently held, same as Free Play — feedback on what you're playing, not a hint about the target. */
  chordResult: ChordDetectionResult
  status: TrainingTaskStatus
  lastEvaluation: StepEvaluation | null
}

export function TrainingTaskView({
  sessionKey,
  prompt,
  heldNotes,
  chordResult,
  status,
  lastEvaluation,
}: TrainingTaskViewProps) {
  const showFeedback = status === 'graded' && lastEvaluation !== null

  return (
    <div className="training-task-view">
      <p className="training-task-view__key">Key: {formatKeySignature(sessionKey)}</p>
      <p className="training-task-view__prompt">{prompt ?? '—'}</p>

      <div className="training-task-view__feedback" aria-live="polite">
        {showFeedback && lastEvaluation && (
          <>
            <span
              className={`training-task-view__result training-task-view__result--${lastEvaluation.result}`}
            >
              {STEP_STATUS_SYMBOL[lastEvaluation.result]}
            </span>
            {lastEvaluation.result !== 'correct' && (
              <span className="training-task-view__diagnostics">
                {formatEvaluationDiagnostics(lastEvaluation)}
              </span>
            )}
          </>
        )}
      </div>

      <p className="training-task-view__chord-name">{formatChordName(chordResult)}</p>

      <PianoKeyboard heldNotes={heldNotes} />
    </div>
  )
}

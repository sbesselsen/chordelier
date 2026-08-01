import { PianoKeyboard } from '../Piano/PianoKeyboard'
import type { ChordDetectionResult } from '../../theory/chordDetection'
import type { MidiNoteNumber } from '../../theory/pitch'
import { formatChordName } from '../../theory/spelling'
import type { StepEvaluation } from '../../training/grading'
import type { TrainingTaskStatus } from '../../training/useTrainingTask'
import { formatEvaluationDiagnostics } from './formatEvaluation'
import { STEP_STATUS_SYMBOL } from './resultSymbols'

export interface TrainingTaskViewProps {
  /** The instruction to play (e.g. "V7/ii") — never the resolved chord name/notes, so the task stays a recall exercise rather than a follow-along. */
  prompt?: string
  heldNotes: ReadonlySet<MidiNoteNumber>
  /** Live recognition of whatever's currently held, same as Free Play — feedback on what you're playing, not a hint about the target. */
  chordResult: ChordDetectionResult
  status: TrainingTaskStatus
  lastEvaluation: StepEvaluation | null
}

export function TrainingTaskView({
  prompt,
  heldNotes,
  chordResult,
  status,
  lastEvaluation,
}: TrainingTaskViewProps) {
  const showFeedback = status === 'graded' && lastEvaluation !== null

  return (
    <div className="training-task-view">
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

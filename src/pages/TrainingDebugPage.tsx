import { useState } from 'react'
import { DevMockKeyboard } from '../components/DevMockKeyboard'
import { PianoKeyboard } from '../components/Piano/PianoKeyboard'
import { useHeldNotes } from '../input/useHeldNotes'
import { mockNoteOff, mockNoteOn } from '../input/mockNoteSource'
import type { KeySignature } from '../theory/scale'
import { pitchClassName } from '../theory/spelling'
import { CURRICULUM, getTaskById } from '../training/curriculum'
import type { StepResult } from '../training/grading'
import { resolveSessionKey } from '../training/session'
import type { TaskDefinition } from '../training/taskSchema'
import { useTrainingTask } from '../training/useTrainingTask'

const RESULT_SYMBOL: Record<StepResult, string> = {
  correct: '✓',
  partial: '~',
  incorrect: '✗',
  noAttempt: '·',
}

// Chromatic octave C4-C5 — covers any single-octave voicing regardless of
// which key/root the currently selected task happens to land on.
const MOCK_NOTES = Array.from({ length: 13 }, (_, i) => 60 + i)

function keyLabel(key: KeySignature): string {
  return `${pitchClassName(key.tonicPitchClass)} ${key.scaleType}`
}

interface TrainingDebugSessionProps {
  task: TaskDefinition
  sessionKey: KeySignature
}

function TrainingDebugSession({ task, sessionKey }: TrainingDebugSessionProps) {
  const trainingTask = useTrainingTask(task, sessionKey)
  const heldNotes = useHeldNotes()

  return (
    <div className="training-debug-session">
      <p>Key: {keyLabel(sessionKey)}</p>
      <p>
        Step {Math.min(trainingTask.stepIndex + 1, trainingTask.totalSteps)} /{' '}
        {trainingTask.totalSteps}
      </p>
      <p className="training-debug-session__prompt">
        {trainingTask.currentPrompt ?? trainingTask.currentDisplayChordName ?? '—'}
      </p>
      <p>
        Status: {trainingTask.status}
        {trainingTask.lastEvaluation ? ` ${RESULT_SYMBOL[trainingTask.lastEvaluation.result]}` : ''}
      </p>

      <ol className="training-debug-session__results">
        {trainingTask.stepResults.map((r, i) => (
          <li key={`${r.stepId}-${i}`}>
            {r.stepId}:{' '}
            {r.outcome.type === 'skipped' ? 'skipped' : RESULT_SYMBOL[r.outcome.evaluation.result]}
          </li>
        ))}
      </ol>

      <div className="training-debug-session__controls">
        <button type="button" onClick={trainingTask.skip}>
          Skip
        </button>
        <button type="button" onClick={trainingTask.reset}>
          Restart
        </button>
        <button type="button" onClick={trainingTask.abandon}>
          Abandon
        </button>
      </div>

      <PianoKeyboard heldNotes={heldNotes} />

      {import.meta.env.DEV && (
        <DevMockKeyboard notes={MOCK_NOTES} onNoteOn={mockNoteOn} onNoteOff={mockNoteOff} />
      )}
    </div>
  )
}

function firstCurriculumTask(): TaskDefinition {
  const task = CURRICULUM[0]
  if (!task) throw new Error('curriculum registry is empty')
  return task
}

const DEFAULT_TASK = firstCurriculumTask()

export function TrainingDebugPage() {
  const [task, setTask] = useState<TaskDefinition>(DEFAULT_TASK)
  const [sessionKey, setSessionKey] = useState<KeySignature>(() => resolveSessionKey(DEFAULT_TASK))

  function selectTask(id: string) {
    const next = getTaskById(id)
    if (!next) return
    setTask(next)
    setSessionKey(resolveSessionKey(next))
  }

  return (
    <div className="training-debug-page">
      <div className="training-debug-page__task-picker">
        <label>
          Task{' '}
          <select value={task.id} onChange={(event) => selectTask(event.target.value)}>
            {CURRICULUM.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} (tier {t.difficulty})
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setSessionKey(resolveSessionKey(task))}>
          New key
        </button>
      </div>

      <TrainingDebugSession
        key={`${task.id}:${sessionKey.tonicPitchClass}:${sessionKey.scaleType}`}
        task={task}
        sessionKey={sessionKey}
      />
    </div>
  )
}

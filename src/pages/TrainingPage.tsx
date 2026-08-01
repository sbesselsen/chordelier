import { useMemo, useState } from 'react'
import { DevMockKeyboard } from '../components/DevMockKeyboard'
import { type KeyChoiceMode, SessionSetup } from '../components/training/SessionSetup'
import { TaskStepIndicator } from '../components/training/TaskStepIndicator'
import { TrainingResultsSummary } from '../components/training/TrainingResultsSummary'
import { TrainingTaskView } from '../components/training/TrainingTaskView'
import '../components/training/training.css'
import { useHeldChordDisplay } from '../hooks/useHeldChordDisplay'
import { useHeldNotes } from '../input/useHeldNotes'
import { mockNoteOff, mockNoteOn } from '../input/mockNoteSource'
import { type PitchClass, pitchClass } from '../theory/pitch'
import type { KeySignature } from '../theory/scale'
import { detectChord } from '../theory/chordDetection'
import { pitchClassName } from '../theory/spelling'
import { CURRICULUM, getTaskById } from '../training/curriculum'
import { resolveSessionKey } from '../training/session'
import type { TaskDefinition } from '../training/taskSchema'
import { useTrainingTask } from '../training/useTrainingTask'

// Chromatic octave C4-C5 — covers any single-octave voicing regardless of
// which key/root the currently selected task happens to land on.
const MOCK_NOTES = Array.from({ length: 13 }, (_, i) => 60 + i)

function firstCurriculumTask(): TaskDefinition {
  const task = CURRICULUM[0]
  if (!task) throw new Error('curriculum registry is empty')
  return task
}

const DEFAULT_TASK = firstCurriculumTask()

interface SessionConfig {
  task: TaskDefinition
  sessionKey: KeySignature
  /** Bumped on "Play again" so a fresh actor is mounted even for an identical task+key. */
  attempt: number
}

function resolveChosenKey(
  task: TaskDefinition,
  keyMode: KeyChoiceMode,
  manualTonic: PitchClass,
): KeySignature {
  if (task.keyMode === 'fixed' || keyMode === 'random') return resolveSessionKey(task)
  return { tonicPitchClass: manualTonic, scaleType: 'major' }
}

interface TrainingSessionProps {
  task: TaskDefinition
  sessionKey: KeySignature
  onPlayAgain: () => void
  onBackToSetup: () => void
}

function TrainingSession({ task, sessionKey, onPlayAgain, onBackToSetup }: TrainingSessionProps) {
  const trainingTask = useTrainingTask(task, sessionKey)
  const heldNotes = useHeldNotes()
  const chordResult = useHeldChordDisplay(useMemo(() => detectChord(heldNotes), [heldNotes]))

  if (trainingTask.status === 'complete' || trainingTask.status === 'abandoned') {
    return (
      <TrainingResultsSummary
        taskTitle={task.title}
        wasAbandoned={trainingTask.status === 'abandoned'}
        totalSteps={trainingTask.totalSteps}
        stepResults={trainingTask.stepResults}
        onPlayAgain={onPlayAgain}
        onBackToSetup={onBackToSetup}
      />
    )
  }

  return (
    <div className="training-session">
      <TaskStepIndicator steps={trainingTask.stepStatuses} />
      <TrainingTaskView
        prompt={trainingTask.currentPrompt}
        heldNotes={heldNotes}
        chordResult={chordResult}
        status={trainingTask.status}
        lastEvaluation={trainingTask.lastEvaluation}
      />
      <div className="training-session__controls">
        <button type="button" onClick={trainingTask.skip}>
          Skip
        </button>
        <button type="button" onClick={onBackToSetup}>
          End session
        </button>
      </div>

      {import.meta.env.DEV && (
        <DevMockKeyboard notes={MOCK_NOTES} onNoteOn={mockNoteOn} onNoteOff={mockNoteOff} />
      )}
    </div>
  )
}

export function TrainingPage() {
  const [session, setSession] = useState<SessionConfig | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState(DEFAULT_TASK.id)
  const [keyMode, setKeyMode] = useState<KeyChoiceMode>('random')
  const [manualTonic, setManualTonic] = useState<PitchClass>(pitchClass(0))

  const selectedTask = getTaskById(selectedTaskId) ?? DEFAULT_TASK

  if (!session) {
    return (
      <SessionSetup
        tasks={CURRICULUM}
        selectedTaskId={selectedTask.id}
        onSelectTask={setSelectedTaskId}
        keyChoiceApplicable={selectedTask.keyMode === 'randomize'}
        fixedKeyLabel={
          selectedTask.fixedKey
            ? `${pitchClassName(selectedTask.fixedKey.tonicPitchClass)} ${selectedTask.fixedKey.scaleType}`
            : undefined
        }
        keyMode={keyMode}
        onKeyModeChange={setKeyMode}
        manualTonic={manualTonic}
        onManualTonicChange={setManualTonic}
        onStart={() =>
          setSession({
            task: selectedTask,
            sessionKey: resolveChosenKey(selectedTask, keyMode, manualTonic),
            attempt: 0,
          })
        }
      />
    )
  }

  return (
    <TrainingSession
      key={`${session.task.id}:${session.sessionKey.tonicPitchClass}:${session.sessionKey.scaleType}:${session.attempt}`}
      task={session.task}
      sessionKey={session.sessionKey}
      onPlayAgain={() =>
        setSession((prev) => (prev ? { ...prev, attempt: prev.attempt + 1 } : prev))
      }
      onBackToSetup={() => setSession(null)}
    />
  )
}

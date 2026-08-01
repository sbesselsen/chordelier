import { type PitchClass, pitchClass } from '../../theory/pitch'
import { pitchClassName } from '../../theory/spelling'
import type { TaskDefinition } from '../../training/taskSchema'

const TONIC_OPTIONS: PitchClass[] = Array.from({ length: 12 }, (_, i) => pitchClass(i))

export type KeyChoiceMode = 'random' | 'manual'

export interface SessionSetupProps {
  tasks: readonly TaskDefinition[]
  selectedTaskId: string
  onSelectTask: (id: string) => void
  /** Only shown/relevant when the selected task's own keyMode is 'randomize' — a task pinned to a fixed key isn't user-choosable. */
  keyChoiceApplicable: boolean
  fixedKeyLabel?: string
  keyMode: KeyChoiceMode
  onKeyModeChange: (mode: KeyChoiceMode) => void
  manualTonic: PitchClass
  onManualTonicChange: (tonic: PitchClass) => void
  onStart: () => void
}

export function SessionSetup({
  tasks,
  selectedTaskId,
  onSelectTask,
  keyChoiceApplicable,
  fixedKeyLabel,
  keyMode,
  onKeyModeChange,
  manualTonic,
  onManualTonicChange,
  onStart,
}: SessionSetupProps) {
  return (
    <div className="session-setup">
      <label className="session-setup__field">
        <span>Task</span>
        <select value={selectedTaskId} onChange={(event) => onSelectTask(event.target.value)}>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title} (tier {task.difficulty})
            </option>
          ))}
        </select>
      </label>

      {keyChoiceApplicable ? (
        <fieldset className="session-setup__field">
          <legend>Key</legend>
          <label>
            <input
              type="radio"
              name="keyMode"
              checked={keyMode === 'random'}
              onChange={() => onKeyModeChange('random')}
            />
            Random
          </label>
          <label>
            <input
              type="radio"
              name="keyMode"
              checked={keyMode === 'manual'}
              onChange={() => onKeyModeChange('manual')}
            />
            Manual
          </label>
          {keyMode === 'manual' && (
            <select
              value={manualTonic}
              onChange={(event) => onManualTonicChange(pitchClass(Number(event.target.value)))}
            >
              {TONIC_OPTIONS.map((tonic) => (
                <option key={tonic} value={tonic}>
                  {pitchClassName(tonic)} major
                </option>
              ))}
            </select>
          )}
        </fieldset>
      ) : (
        <p className="session-setup__fixed-key">Key: {fixedKeyLabel}</p>
      )}

      <button type="button" className="session-setup__start" onClick={onStart}>
        Start
      </button>
    </div>
  )
}

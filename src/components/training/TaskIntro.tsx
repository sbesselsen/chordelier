import type { TaskDefinition } from '../../training/taskSchema'

export interface TaskIntroProps {
  task: TaskDefinition
  onStart: () => void
}

export function TaskIntro({ task, onStart }: TaskIntroProps) {
  return (
    <div className="task-intro">
      <h2>{task.title}</h2>
      {task.description && <p className="task-intro__description">{task.description}</p>}
      <button type="button" className="task-intro__start" onClick={onStart}>
        Start playing
      </button>
    </div>
  )
}

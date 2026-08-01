import { pitchClass } from '../theory/pitch'
import type { KeySignature, ScaleType } from '../theory/scale'
import type { TaskDefinition } from './taskSchema'

export function randomKeySignature(scaleTypes: readonly ScaleType[] = ['major']): KeySignature {
  const tonicPitchClass = pitchClass(Math.floor(Math.random() * 12))
  const scaleType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)]
  if (scaleType === undefined)
    throw new Error('randomKeySignature requires at least one scale type')
  return { tonicPitchClass, scaleType }
}

/** Resolves a task's session key per its own keyMode — the one place that decides "which key are we playing this in." */
export function resolveSessionKey(task: TaskDefinition): KeySignature {
  if (task.keyMode === 'fixed') {
    if (!task.fixedKey) throw new Error(`Task ${task.id} has keyMode 'fixed' but no fixedKey`)
    return task.fixedKey
  }
  return randomKeySignature()
}

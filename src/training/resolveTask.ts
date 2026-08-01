import { getChordQuality } from '../theory/chordQuality'
import { type PitchClass, pitchClass } from '../theory/pitch'
import { resolveRomanNumeral } from '../theory/romanNumeral'
import type { KeySignature } from '../theory/scale'
import { pitchClassName } from '../theory/spelling'
import type { ChordTarget, GradingMode, TaskDefinition } from './taskSchema'

export interface ResolvedTaskStep {
  id: string
  expectedPitchClasses: readonly PitchClass[]
  expectedRootPitchClass: PitchClass
  expectedBassPitchClass: PitchClass
  gradingMode: GradingMode
  prompt?: string
  displayChordName: string
}

interface ResolvedTarget {
  rootPitchClass: PitchClass
  /** Ascending-from-root order; index 0 is root position. */
  pitchClasses: readonly PitchClass[]
  qualitySymbol: string
}

function resolveChordTarget(target: ChordTarget, key: KeySignature): ResolvedTarget {
  switch (target.kind) {
    case 'romanNumeral': {
      const resolved = resolveRomanNumeral(target.chord, key)
      return { ...resolved, qualitySymbol: getChordQuality(target.chord.quality).symbolSuffix }
    }
    case 'explicit': {
      const quality = getChordQuality(target.quality)
      return {
        rootPitchClass: target.root,
        pitchClasses: quality.intervals.map((interval) => pitchClass(target.root + interval)),
        qualitySymbol: quality.symbolSuffix,
      }
    }
    case 'chromaticVoice': {
      const baseRoot =
        'degree' in target.base
          ? resolveRomanNumeral(target.base, key).rootPitchClass
          : target.base.root
      return {
        rootPitchClass: baseRoot,
        pitchClasses: target.targetIntervals.map((interval) => pitchClass(baseRoot + interval)),
        qualitySymbol: '',
      }
    }
  }
}

function targetInversionIndex(target: ChordTarget): number {
  return target.kind === 'explicit' ? (target.inversion ?? 0) : 0
}

export function resolveTask(task: TaskDefinition, sessionKey: KeySignature): ResolvedTaskStep[] {
  return task.steps.map((step) => {
    const resolved = resolveChordTarget(step.target, sessionKey)
    const inversionIndex = step.requiredInversion ?? targetInversionIndex(step.target)
    const bassPitchClass = resolved.pitchClasses[inversionIndex]
    if (bassPitchClass === undefined) {
      throw new Error(
        `Task step ${step.id}: inversion ${inversionIndex} is out of range for ${resolved.pitchClasses.length} chord tones`,
      )
    }

    const displayChordName =
      step.prompt ?? `${pitchClassName(resolved.rootPitchClass)}${resolved.qualitySymbol}`

    return {
      id: step.id,
      expectedPitchClasses: resolved.pitchClasses,
      expectedRootPitchClass: resolved.rootPitchClass,
      expectedBassPitchClass: bassPitchClass,
      gradingMode: step.gradingMode ?? task.defaultGradingMode,
      prompt: step.prompt,
      displayChordName,
    }
  })
}

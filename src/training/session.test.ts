import { describe, expect, it } from 'vitest'
import { getTaskById } from './curriculum'
import { randomKeySignature, resolveSessionKey } from './session'

describe('randomKeySignature', () => {
  it('produces a valid pitch class tonic', () => {
    for (let i = 0; i < 50; i++) {
      const key = randomKeySignature()
      expect(key.tonicPitchClass).toBeGreaterThanOrEqual(0)
      expect(key.tonicPitchClass).toBeLessThanOrEqual(11)
      expect(key.scaleType).toBe('major')
    }
  })

  it('samples from a provided scale type list', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 50; i++) seen.add(randomKeySignature(['major', 'naturalMinor']).scaleType)
    expect([...seen].every((s) => s === 'major' || s === 'naturalMinor')).toBe(true)
  })
})

describe('resolveSessionKey', () => {
  it('returns the fixed key for a fixed-keyMode task', () => {
    const task = getTaskById('line-cliche-rising-to-V')
    if (!task) throw new Error('fixture missing')
    expect(resolveSessionKey(task)).toEqual(task.fixedKey)
  })

  it('randomizes for a randomize-keyMode task', () => {
    const task = getTaskById('diatonic-I-IV-vi-V')
    if (!task) throw new Error('fixture missing')
    const key = resolveSessionKey(task)
    expect(key.tonicPitchClass).toBeGreaterThanOrEqual(0)
    expect(key.tonicPitchClass).toBeLessThanOrEqual(11)
  })

  it('throws for a fixed-keyMode task with no fixedKey set', () => {
    expect(() =>
      resolveSessionKey({
        id: 'broken',
        title: 'broken',
        difficulty: 1,
        tags: [],
        defaultGradingMode: 'pitchClass',
        keyMode: 'fixed',
        steps: [],
      }),
    ).toThrow()
  })
})

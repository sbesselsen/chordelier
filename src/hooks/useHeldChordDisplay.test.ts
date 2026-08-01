import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHeldChordDisplay } from './useHeldChordDisplay'
import type { ChordDetectionResult } from '../theory/chordDetection'
import { midiNote, pitchClass } from '../theory/pitch'

const EMPTY: ChordDetectionResult = { status: 'empty' }
const C_MAJOR: ChordDetectionResult = {
  status: 'match',
  root: pitchClass(0),
  quality: 'maj',
  bassPitchClass: pitchClass(0),
  inversion: 0,
  notes: [midiNote(60), midiNote(64), midiNote(67)],
  alternateReadings: [],
}
const UNRECOGNIZED: ChordDetectionResult = {
  status: 'unrecognized',
  notes: [midiNote(60), midiNote(61)],
}

function renderChordHook(initial: ChordDetectionResult) {
  return renderHook<ChordDetectionResult, { r: ChordDetectionResult }>(
    ({ r }) => useHeldChordDisplay(r),
    {
      initialProps: { r: initial },
    },
  )
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useHeldChordDisplay', () => {
  it('applies a fresh match immediately', () => {
    const { result } = renderChordHook(EMPTY)
    expect(result.current).toEqual(EMPTY)

    const { result: result2, rerender } = renderChordHook(EMPTY)
    rerender({ r: C_MAJOR })
    expect(result2.current).toEqual(C_MAJOR)
  })

  it('holds the last recognized chord briefly before downgrading, then applies the downgrade', () => {
    const { result, rerender } = renderChordHook(C_MAJOR)
    expect(result.current).toEqual(C_MAJOR)

    rerender({ r: UNRECOGNIZED })
    // Still showing the held chord immediately after the downgrade arrives.
    expect(result.current).toEqual(C_MAJOR)

    act(() => vi.advanceTimersByTime(119))
    expect(result.current).toEqual(C_MAJOR)

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toEqual(UNRECOGNIZED)
  })

  it('a new match cancels a pending hold and replaces immediately', () => {
    const otherMatch: ChordDetectionResult = { ...C_MAJOR, root: pitchClass(5) } // F major
    const { result, rerender } = renderChordHook(C_MAJOR)

    rerender({ r: UNRECOGNIZED })
    act(() => vi.advanceTimersByTime(50)) // hold still pending
    rerender({ r: otherMatch })
    expect(result.current).toEqual(otherMatch)

    // The now-stale pending timeout must not fire and clobber the new match.
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toEqual(otherMatch)
  })

  it('does not loop when passed the same stable reference repeatedly', () => {
    const listener = vi.fn()
    const { rerender } = renderHook<ChordDetectionResult, { r: ChordDetectionResult }>(
      ({ r }) => {
        listener()
        return useHeldChordDisplay(r)
      },
      { initialProps: { r: C_MAJOR } },
    )

    listener.mockClear()
    rerender({ r: C_MAJOR }) // same reference, simulating a memoized caller
    act(() => vi.runAllTimers())
    // One render for the rerender itself; must not cascade into more.
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

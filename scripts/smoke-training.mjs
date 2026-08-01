#!/usr/bin/env node
// End-to-end smoke test for the Training flow. Covers the things unit tests
// can't (real timing, real DOM) and specifically re-checks two bugs that
// were only caught by browser testing:
//   - resting on an already-graded chord must never auto-grade the next step
//   - V7/ii -> ii: the "ii" step must accept a plain triad, not a 7th chord
import {
  launchBrowser,
  newPage,
  playChord,
  releaseChord,
  playChordAndAdvance,
  clearAllMockNotes,
  BASE_URL,
  reportConsoleErrors,
} from './lib/browser.mjs'

let failed = false
function check(label, condition) {
  console.log(`${condition ? 'OK' : 'FAIL'} - ${label}`)
  if (!condition) failed = true
}

// Assumes the Training tab is already active and .session-setup is showing
// (true on first load after clicking the tab, and true again after
// "Choose another task" / "End session" — neither of those leaves the tab).
async function startManualSession(page, taskLabel) {
  await page.waitForSelector('.session-setup')
  if (taskLabel) await page.selectOption('select', { label: taskLabel })
  // Fixed-key tasks (e.g. the line cliché) don't show a key picker at all —
  // only click "Manual" (deterministic key) when the task has one.
  const manualRadio = page.getByRole('radio', { name: 'Manual' })
  if (await manualRadio.count()) await manualRadio.click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForSelector('.task-intro')
  await page.getByRole('button', { name: 'Start playing' }).click()
  await page.waitForSelector('.training-task-view')
}

const browser = await launchBrowser()
const { page, consoleErrors } = await newPage(browser)
await page.goto(BASE_URL)
await page.getByRole('button', { name: 'Training' }).click()

// --- Full playthrough: I IV vi V, all correct, ends at the results summary ---
await startManualSession(page, 'I – IV – vi – V (tier 1)')
check(
  'step 1 prompt is "I"',
  (await page.locator('.training-task-view__prompt').textContent()) === 'I',
)

await playChordAndAdvance(page, [60, 64, 67]) // I  = C E G
await playChordAndAdvance(page, [65, 69, 60]) // IV = F A C
await playChordAndAdvance(page, [69, 60, 64]) // vi = A C E
await playChordAndAdvance(page, [67, 71, 62]) // V  = G B D

await page.waitForSelector('.training-results-summary')
const tally = await page.locator('.training-results-summary__tally').textContent()
check(
  `full I-IV-vi-V run scores 4/4 correct (got "${tally?.trim()}")`,
  /4 correct, 0 close, 0 missed/.test(tally ?? ''),
)
await clearAllMockNotes(page) // guard against the last chord's release racing the results-summary swap

// --- Regression: resting on a graded chord must not auto-grade the next step ---
await page.getByRole('button', { name: 'Choose another task' }).click()
await startManualSession(page, 'I – IV – vi – V (tier 1)')
await playChord(page, [60, 64, 67])
await page.waitForTimeout(1300) // grades + advances to step 2
await page.waitForTimeout(3000) // keep resting on C-E-G well past SETTLE_MS
const resultShownWhileResting = await page.locator('.training-task-view__result').count()
check(
  'resting on the old chord after advancing does not trigger a grade',
  resultShownWhileResting === 0,
)
await releaseChord(page, [60, 64, 67])
await clearAllMockNotes(page)

// --- Regression: V7/ii -> ii must accept a plain triad (not a 7th chord) ---
await page.getByRole('button', { name: 'End session' }).click()
await startManualSession(page, 'ii via its secondary dominant (tier 4)')
await playChordAndAdvance(page, [69, 61, 64, 67]) // V7/ii = A C# E G
check(
  'step 2 prompt is "ii" (no "7")',
  (await page.locator('.training-task-view__prompt').textContent()) === 'ii',
)
await playChord(page, [62, 65, 69]) // plain D minor triad, no C
await page.waitForTimeout(700)
const resultSymbol = await page
  .locator('.training-task-view__result')
  .textContent()
  .catch(() => null)
check(`plain ii triad grades correct (got "${resultSymbol}")`, resultSymbol === '✓')
await releaseChord(page, [62, 65, 69])
await clearAllMockNotes(page)

// --- Regression: per-step mistake detail must survive into the results summary, not just the tally ---
await page.getByRole('button', { name: 'End session' }).click()
await startManualSession(page, 'I – IV – vi – V (tier 1)')
await playChordAndAdvance(page, [60, 64, 67]) // I  = C E G, correct
await playChordAndAdvance(page, [65, 60]) // IV = F A C, missing A -> partial
await playChordAndAdvance(page, [69, 60, 64, 61]) // vi = A C E, extra C# -> incorrect
await playChordAndAdvance(page, [67, 71, 62]) // V  = G B D, correct

await page.waitForSelector('.training-results-summary')
const stepRows = await page.locator('.training-results-summary__step').all()
check('results breakdown lists all 4 steps', stepRows.length === 4)
const ivText = await stepRows[1]?.textContent()
check(
  `step 2 (IV, missing A) shows "Missing A" (got "${ivText}")`,
  /Missing A\b/.test(ivText ?? ''),
)
const viText = await stepRows[2]?.textContent()
check(`step 3 (vi, extra C#) shows "Extra" (got "${viText}")`, /Extra /.test(viText ?? ''))
const iText = await stepRows[0]?.textContent()
check(`step 1 (correct) shows no diagnostics (got "${iText}")`, !/Missing|Extra/.test(iText ?? ''))
await clearAllMockNotes(page)

// --- Regression: right notes but wrong bass (exactVoicing) must explain the bass, not show blank diagnostics ---
await page.getByRole('button', { name: 'Choose another task' }).click()
await startManualSession(page, 'Line cliché rising to the dominant (tier 5)')
await playChordAndAdvance(page, [48, 51, 55]) // i = C Eb G, root position
await playChordAndAdvance(page, [48, 51, 56]) // i(#5) = C Eb G#, root position
await playChordAndAdvance(page, [48, 51, 57]) // i(6) = C Eb A, root position
await playChordAndAdvance(page, [59, 62, 65, 67]) // V7 = G B D F, all correct pitch classes, but B3 (59) is the bass instead of G

await page.waitForSelector('.training-results-summary')
const lastStepText = await page.locator('.training-results-summary__step').last().textContent()
check(
  `V7 in the wrong inversion shows "close" with a bass explanation (got "${lastStepText}")`,
  /~/.test(lastStepText ?? '') && /Wrong bass note/.test(lastStepText ?? ''),
)
await clearAllMockNotes(page)

reportConsoleErrors(consoleErrors)
check('no console errors', consoleErrors.length === 0)

await browser.close()
process.exit(failed ? 1 : 0)

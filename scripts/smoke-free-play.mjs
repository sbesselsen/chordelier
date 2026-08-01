#!/usr/bin/env node
// End-to-end smoke test for the Free Play page: connect via the dev mock
// keyboard, play a chord, confirm it's recognized and displayed, release,
// confirm it clears. Fails loudly (non-zero exit) on any mismatch or
// console error.
import {
  launchBrowser,
  newPage,
  playChord,
  releaseChord,
  BASE_URL,
  reportConsoleErrors,
} from './lib/browser.mjs'

let failed = false
function check(label, condition) {
  console.log(`${condition ? 'OK' : 'FAIL'} - ${label}`)
  if (!condition) failed = true
}

const browser = await launchBrowser()
const { page, consoleErrors } = await newPage(browser)

await page.goto(BASE_URL)
await page.waitForSelector('.free-play-page')

check(
  'starts with the empty-chord placeholder',
  (await page.getByText('Play something').count()) === 1,
)

await playChord(page, [60, 64, 67]) // C major
await page.waitForTimeout(200)
const chordName = await page.locator('.chord-name-display').textContent()
check(`shows "C" for C-E-G (got "${chordName?.trim()}")`, chordName?.trim() === 'C')

const heldCount = await page.locator('.piano-key--held').count()
check(`3 piano keys highlighted (got ${heldCount})`, heldCount === 3)

await releaseChord(page, [60, 64, 67])
await page.waitForTimeout(200)
check(
  'clears back to the placeholder after release',
  (await page.getByText('Play something').count()) === 1,
)

reportConsoleErrors(consoleErrors)
check('no console errors', consoleErrors.length === 0)

await browser.close()
process.exit(failed ? 1 : 0)

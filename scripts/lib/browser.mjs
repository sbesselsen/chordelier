// Shared Playwright helpers for the browser-driven verification scripts in
// scripts/. Uses Alpine's native `chromium` package (installed via the
// devcontainer Dockerfile) rather than Playwright's own bundled Chromium,
// which is a glibc build and doesn't run on this musl-based container.
import { chromium } from 'playwright'

export const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium'
export const BASE_URL = process.env.CHORDELIER_URL || 'http://localhost:5183'

export async function launchBrowser(options = {}) {
  return chromium.launch({
    executablePath: CHROMIUM_PATH,
    args: ['--no-sandbox'],
    ...options,
  })
}

/** New page wired to collect console errors and uncaught page errors as they happen. */
export async function newPage(browser, viewport = { width: 1000, height: 900 }) {
  const page = await browser.newPage({ viewport })
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))
  return { page, consoleErrors }
}

// Mock input is driven through window.__mockNoteSource (see
// src/input/mockNoteSource.ts, dev-only) rather than clicking the
// DevMockKeyboard's DOM buttons. Clicking works too, but only while that
// component happens to be mounted — once a training session ends and the
// results summary replaces it, a press made moments earlier can't be
// released anymore by clicking, silently leaving it stuck "held" in the
// shared store for the rest of the browser session and contaminating
// every chord played after. The window hook works regardless of what's
// currently mounted.

export async function pressMockNote(page, note) {
  await page.evaluate((n) => window.__mockNoteSource?.noteOn(n), note)
}

export async function releaseMockNote(page, note) {
  await page.evaluate((n) => window.__mockNoteSource?.noteOff(n), note)
}

export async function playChord(page, notes) {
  for (const note of notes) await pressMockNote(page, note)
}

export async function releaseChord(page, notes) {
  for (const note of notes) await releaseMockNote(page, note)
}

/** Releases every note the mock source is currently holding, regardless of what was pressed or by which script. Use between scenarios to guarantee a clean slate. */
export async function clearAllMockNotes(page) {
  await page.evaluate(() => window.__mockNoteSource?.clear())
}

/**
 * Presses a chord, waits past the training machine's SETTLE_MS + FEEDBACK_MS
 * (see src/training/taskMachine.ts) so it grades and auto-advances, then
 * releases. Margins are generous on purpose — this drives a real browser,
 * not fake timers.
 */
export async function playChordAndAdvance(page, notes, { settleMs = 700, feedbackMs = 600 } = {}) {
  await playChord(page, notes)
  await page.waitForTimeout(settleMs + feedbackMs)
  await releaseChord(page, notes)
}

export function reportConsoleErrors(consoleErrors) {
  if (consoleErrors.length === 0) {
    console.log('Console errors: none')
    return
  }
  console.log(`Console errors (${consoleErrors.length}):`)
  for (const err of consoleErrors) console.log(' -', err)
}

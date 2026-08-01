#!/usr/bin/env node
// Quick visual check: navigate to a tab, optionally click through some
// selectors, screenshot, and report console errors. For anything more
// specific, write a one-off script that imports scripts/lib/browser.mjs —
// this just covers "let me see what the app looks like right now."
//
// Usage:
//   node scripts/screenshot.mjs [outFile] [--tab=freePlay|training] [--click="button:has-text(Foo)"]...
//
// Examples:
//   node scripts/screenshot.mjs
//   node scripts/screenshot.mjs out.png --tab=training
//   node scripts/screenshot.mjs out.png --tab=training --click="text=Manual" --click="text=Start"
import { launchBrowser, newPage, BASE_URL, reportConsoleErrors } from './lib/browser.mjs'

const args = process.argv.slice(2)
const outFile = args.find((a) => !a.startsWith('--')) || 'scripts/screenshots/screenshot.png'
const tabArg = args.find((a) => a.startsWith('--tab='))?.slice('--tab='.length)
const clicks = args.filter((a) => a.startsWith('--click=')).map((a) => a.slice('--click='.length))

const TAB_LABEL = { freePlay: 'Free Play', training: 'Training' }

const browser = await launchBrowser()
const { page, consoleErrors } = await newPage(browser)

await page.goto(BASE_URL)
await page.waitForSelector('h1')

if (tabArg) {
  const label = TAB_LABEL[tabArg]
  if (!label)
    throw new Error(
      `Unknown --tab=${tabArg}, expected one of: ${Object.keys(TAB_LABEL).join(', ')}`,
    )
  await page.getByRole('button', { name: label }).click()
}

for (const selector of clicks) {
  await page.locator(selector).first().click()
  await page.waitForTimeout(150)
}

await page.waitForTimeout(200)
await page.screenshot({ path: outFile, fullPage: true })
console.log('Saved screenshot to', outFile)
reportConsoleErrors(consoleErrors)

await browser.close()

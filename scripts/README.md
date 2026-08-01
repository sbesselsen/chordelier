# Browser verification scripts

Dev tooling for actually running the app in a browser and checking it, not
just unit tests. Uses Alpine's native `chromium` package (installed in the
devcontainer image) rather than Playwright's own bundled Chromium — the
bundled one is a glibc build and doesn't run on this musl-based container.

## Dev server

```sh
scripts/dev-server.sh start [port]    # default port 5183
scripts/dev-server.sh stop [port]
scripts/dev-server.sh restart [port]
scripts/dev-server.sh status [port]
```

Finds/kills the real vite process by matching its `--port` argument via
`ps`, not a pidfile — a backgrounded `pnpm dev &` only gives you the pnpm
wrapper's PID, and pnpm doesn't forward signals to the vite child it spawns.

## Smoke tests

```sh
scripts/dev-server.sh start
node scripts/smoke-free-play.mjs
node scripts/smoke-training.mjs
scripts/dev-server.sh stop
```

Each prints `OK`/`FAIL` per check and exits non-zero if anything failed —
safe to run after any change that touches MIDI input handling, chord
detection, or the training machine. `smoke-training.mjs` specifically
re-checks two bugs that only real browser testing caught: a step
auto-grading against notes resting unchanged from the previous step, and
the V7/ii → ii step requiring a 7th chord when the prompt only asked for a
plain triad.

## Quick visual check

```sh
node scripts/screenshot.mjs [outFile] [--tab=freePlay|training] [--click=selector]...
```

Screenshots go to `scripts/screenshots/` by default (gitignored). For
anything more specific than a screenshot, write a one-off script that
imports `scripts/lib/browser.mjs` rather than extending this one.

## Library

`scripts/lib/browser.mjs` exports `launchBrowser`, `newPage` (wired to
collect console/page errors), `pressMockNote`/`releaseMockNote`/`playChord`/
`releaseChord` (drive the dev-only mock keyboard — `import.meta.env.DEV`
only, never in production builds), and `playChordAndAdvance` (press, wait
past the training machine's settle+feedback window, release).

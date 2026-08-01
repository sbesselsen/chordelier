#!/usr/bin/env bash
# Manage the Vite dev server for browser-driven verification scripts.
#
# Usage:
#   scripts/dev-server.sh start [port]    # default port 5183
#   scripts/dev-server.sh stop [port]
#   scripts/dev-server.sh restart [port]
#   scripts/dev-server.sh status [port]
#
# Finds/kills by matching the vite process's --port argument via `ps`
# rather than a pidfile or `lsof` — a backgrounded `pnpm dev &` only gives
# you the pnpm wrapper's PID, and pnpm doesn't forward signals to the vite
# child it spawns, so killing that PID alone doesn't free the port. `lsof`
# is unreliable in this container's busybox environment. Matching the real
# vite process directly works regardless of how it was spawned.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${2:-5183}"

find_pids() {
  # First all-numeric field on each matching line is the PID, regardless of
  # column order — BusyBox's `ps aux` is "PID USER TIME COMMAND" (PID
  # first), GNU's is "USER PID %CPU..." (PID second, after a non-numeric
  # username). Portable across both instead of hardcoding a column index.
  ps aux | grep "[v]ite.*--port $PORT" | awk '{ for (i=1;i<=NF;i++) if ($i ~ /^[0-9]+$/) { print $i; break } }'
}

start() {
  local existing
  existing="$(find_pids || true)"
  if [ -n "$existing" ]; then
    echo "Dev server already running on port $PORT (pid $existing)"
    return 0
  fi
  (cd "$ROOT_DIR" && nohup pnpm dev --port "$PORT" > /tmp/chordelier-dev.log 2>&1 &)
  echo "Starting dev server on port $PORT..."
  timeout 30 bash -c "until curl -sf http://localhost:$PORT >/dev/null; do sleep 1; done"
  echo "Dev server ready at http://localhost:$PORT"
}

stop() {
  local pids
  pids="$(find_pids || true)"
  if [ -z "$pids" ]; then
    echo "No dev server running on port $PORT"
    return 0
  fi
  echo "$pids" | xargs -r kill
  echo "Stopped dev server on port $PORT (pid(s): $pids)"
}

status() {
  local pids
  pids="$(find_pids || true)"
  if [ -z "$pids" ]; then
    echo "Not running on port $PORT"
  else
    echo "Running on port $PORT (pid(s): $pids)"
  fi
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) status ;;
  *)
    echo "Usage: $0 start|stop|restart|status [port]" >&2
    exit 1
    ;;
esac

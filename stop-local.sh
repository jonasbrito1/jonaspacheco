#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/tmp/jonaspacheco-local"

for pid_file in "$LOG_DIR"/*.pid; do
  [[ -e "$pid_file" ]] || continue
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
done

echo 'Local processes stopped.'

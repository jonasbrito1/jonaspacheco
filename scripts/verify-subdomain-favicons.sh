#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check_file_contains() {
  local file="$1"
  local expected="$2"

  if ! grep -Fq "$expected" "$file"; then
    echo "FALHOU: '$expected' nao encontrado em $file" >&2
    exit 1
  fi
}

check_exists() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "FALHOU: arquivo ausente em $file" >&2
    exit 1
  fi
}

check_file_contains "$ROOT_DIR/hub/frontend/index.html" "/jp-logo.png"
check_file_contains "$ROOT_DIR/hub/portal/index.html" "/jp-logo.png"
check_file_contains "$ROOT_DIR/licita/app/layout.tsx" "/jp-logo.png"

check_exists "$ROOT_DIR/hub/frontend/public/jp-logo.png"
check_exists "$ROOT_DIR/hub/portal/public/jp-logo.png"
check_exists "$ROOT_DIR/licita/public/jp-logo.png"

echo "OK: favicon alinhado nos subdominios admin, portal e licita."

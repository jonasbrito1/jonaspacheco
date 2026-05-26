#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp/jonaspacheco-local"
mkdir -p "$LOG_DIR"

ensure_postgres() {
  if docker ps --format '{{.Names}}' | grep -qx 'jonas-postgres-55432'; then
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -qx 'jonas-postgres-55432'; then
    docker start jonas-postgres-55432 >/dev/null
    return
  fi

  docker run \
    --name jonas-postgres-55432 \
    -e POSTGRES_USER=jonas \
    -e POSTGRES_PASSWORD=jonas \
    -e POSTGRES_DB=hub_jonas \
    -p 55432:5432 \
    -d postgres:16 >/dev/null
}

wait_for_postgres() {
  until pg_isready -h localhost -p 55432 -U jonas -d hub_jonas >/dev/null 2>&1; do
    sleep 1
  done
}

ensure_envs() {
  if [[ ! -f "$ROOT_DIR/hub/backend/.env" ]]; then
    cp "$ROOT_DIR/hub/backend/.env.example" "$ROOT_DIR/hub/backend/.env"
    perl -0pi -e "s#DATABASE_URL=.*#DATABASE_URL=postgresql://jonas:jonas\\@localhost:55432/hub_jonas#; s#JWT_SECRET=.*#JWT_SECRET=dev-local-secret#; s#FRONTEND_URL=.*#FRONTEND_URL=http://localhost:5175#; s#NOTIFY_EMAIL=.*#NOTIFY_EMAIL=#; s#SMTP_USER=.*#SMTP_USER=#; s#SMTP_PASS=.*#SMTP_PASS=#; s#PUBLIC_TICKET_KEY=.*#PUBLIC_TICKET_KEY=dev-public-ticket-key#" "$ROOT_DIR/hub/backend/.env"
    printf '\nPORTAL_URL=http://localhost:5174\n' >> "$ROOT_DIR/hub/backend/.env"
  fi

  if [[ ! -f "$ROOT_DIR/licita/.env" ]]; then
    cp "$ROOT_DIR/licita/.env.example" "$ROOT_DIR/licita/.env"
    perl -0pi -e "s#NEXT_PUBLIC_SUPABASE_URL=.*#NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co#; s#NEXT_PUBLIC_SUPABASE_ANON_KEY=.*#NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key#; s#NEXT_PUBLIC_LOCAL_MODE=.*#NEXT_PUBLIC_LOCAL_MODE=true#; s#NODE_ENV=.*#NODE_ENV=development#" "$ROOT_DIR/licita/.env"
  fi
}

start_service() {
  local name="$1"
  local workdir="$2"
  local cmd="$3"
  local pid_file="$LOG_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"

  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name already running (pid $(cat "$pid_file"))"
    return
  fi

  (
    cd "$workdir"
    nohup bash -lc "$cmd" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  echo "$name started"
}

echo '==> Preparing local environment'
ensure_postgres
wait_for_postgres
ensure_envs

echo '==> Running hub migrations'
(
  cd "$ROOT_DIR/hub/backend"
  node src/db/migrate.js >/dev/null
  node <<'NODE'
const bcrypt = require('bcryptjs')
const { Client } = require('pg')

async function main() {
  const client = new Client({ connectionString: 'postgresql://jonas:jonas@localhost:55432/hub_jonas' })
  await client.connect()
  const hash = await bcrypt.hash('admin123', 10)
  await client.query(
    'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role',
    ['Admin Local', 'admin@local.dev', hash, 'admin']
  )
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
NODE
)

echo '==> Starting services'
start_service "landing" "$ROOT_DIR" "python3 -m http.server 8080"
start_service "hub-backend" "$ROOT_DIR/hub/backend" "npm run dev"
start_service "hub-frontend" "$ROOT_DIR/hub/frontend" "npm run dev -- --host 0.0.0.0 --port 5175"
start_service "hub-portal" "$ROOT_DIR/hub/portal" "npm run dev -- --host 0.0.0.0 --port 5174"
start_service "licita" "$ROOT_DIR/licita" "npm run dev -- --hostname 0.0.0.0 --port 3100"

cat <<'EOF'

Local URLs
- Landing: http://localhost:8080
- Hub API: http://localhost:3200
- Hub Admin: http://localhost:5175
- Hub Portal: http://localhost:5174
- Licita: http://localhost:3100

Credenciais locais do hub
- admin@local.dev
- admin123

Credenciais demo do licita
- licitacoes@local.dev
- 123456

Logs
- /tmp/jonaspacheco-local
EOF

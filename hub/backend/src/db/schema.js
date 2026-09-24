/**
 * Esquema do hub pessoal. Roda na subida do processo e e idempotente, entao
 * o deploy nao precisa de um passo separado de migracao.
 *
 * Tabelas do hub antigo (tickets, blog, taskflow, financeiro) continuam no
 * banco intocadas; o hub novo simplesmente nao as usa.
 */
const pool = require('./pool');
const analytics = require('../modules/analytics/helpers');

const DEFAULT_SITES = [
  ['Jonas Pacheco (landing)', 'https://jonaspacheco.cloud'],
  ['Vitaunic', 'https://vitaunic.com.br'],
  ['Incor Manaus', 'https://incormanaus.med.br'],
  ['Vó Maria Café', 'https://vomariacafe.com.br'],
  ['Gracie Barra Cidade Nova', 'https://gbcidadenovaam.com.br'],
  ['Nortear', 'https://norteartec.com.br'],
  ['NortRH', 'https://nortrh.norteartec.com.br'],
  ['Hub Nortear', 'https://hub.norteartec.com.br'],
  ['Horizonte do Saber', 'https://horizontedosaber.com.br'],
  ['Horizonte Educação', 'https://horizonteedu.com.br'],
  ['Evolution Engenharia', 'https://www.evolutionengenharia.com.br'],
  ['Hidro Evolution', 'https://hidro.evolutionengenharia.com.br'],
  ['WR Confecções', 'https://wrconfeccoes.jonaspacheco.cloud'],
];

async function ensureSchema() {
  // users ja existe no banco (herdada do hub antigo); garante as colunas usadas.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS password_resets (
      id          SERIAL PRIMARY KEY,
      user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  CHAR(64) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ NOT NULL,
      used_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sites (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(120) NOT NULL,
      url         VARCHAR(300) NOT NULL UNIQUE,
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS site_checks (
      id           BIGSERIAL PRIMARY KEY,
      site_id      INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      checked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ok           BOOLEAN NOT NULL,
      status_code  INT,
      latency_ms   INT,
      cert_days    INT,
      error        VARCHAR(200)
    );
    CREATE INDEX IF NOT EXISTS idx_site_checks_site_time ON site_checks (site_id, checked_at);

    CREATE TABLE IF NOT EXISTS vps_samples (
      at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cpu         REAL,
      mem_used    BIGINT,
      mem_total   BIGINT,
      disk_used   BIGINT,
      disk_total  BIGINT,
      net_rx      BIGINT,
      net_tx      BIGINT,
      load1       REAL
    );
    CREATE INDEX IF NOT EXISTS idx_vps_samples_at ON vps_samples (at);

    CREATE TABLE IF NOT EXISTS hub_projects (
      id           SERIAL PRIMARY KEY,
      name         VARCHAR(160) NOT NULL,
      client       VARCHAR(160),
      status       VARCHAR(30) NOT NULL DEFAULT 'ativo',
      url          VARCHAR(300),
      repo_url     VARCHAR(300),
      stack        TEXT[] NOT NULL DEFAULT '{}',
      description  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hub_notes (
      id          SERIAL PRIMARY KEY,
      title       VARCHAR(200) NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      tags        TEXT[] NOT NULL DEFAULT '{}',
      pinned      BOOLEAN NOT NULL DEFAULT false,
      project_id  INT REFERENCES hub_projects(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await analytics.ensureSchema();

  // Semeia os sites so na primeira vez; depois a lista e gerida pela tela.
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM sites');
  if (!rows[0].n) {
    for (const [name, url] of DEFAULT_SITES) {
      await pool.query('INSERT INTO sites (name, url) VALUES ($1, $2) ON CONFLICT (url) DO NOTHING', [name, url]);
    }
  }
}

module.exports = { ensureSchema };

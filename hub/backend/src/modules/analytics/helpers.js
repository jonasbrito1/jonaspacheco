const crypto = require('crypto');
const pool = require('../../db/pool');

// Dono do painel de acessos. Somente este e-mail enxerga os dados.
const OWNER_EMAIL = (process.env.ANALYTICS_OWNER_EMAIL || 'jonasbrito1a@gmail.com').trim().toLowerCase();

// Hosts de onde aceitamos eventos (evita que terceiros poluam a base).
const ALLOWED_HOSTS = (process.env.ANALYTICS_ALLOWED_HOSTS || 'jonaspacheco.cloud,www.jonaspacheco.cloud')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

const RETENTION_DAYS = Number(process.env.ANALYTICS_RETENTION_DAYS || 180);
const TZ = 'America/Manaus';

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|java\/|httpclient|scrapy|phantom|selenium|puppeteer|playwright/i;

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id           BIGSERIAL PRIMARY KEY,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type         VARCHAR(20) NOT NULL,
      visitor_id   CHAR(16)    NOT NULL,
      path         VARCHAR(300),
      target       VARCHAR(300),
      referrer     VARCHAR(255),
      utm_source   VARCHAR(100),
      country      CHAR(2),
      region       VARCHAR(100),
      city         VARCHAR(100),
      ip_anon      VARCHAR(64),
      browser      VARCHAR(40),
      os           VARCHAR(40),
      device       VARCHAR(10),
      lang         VARCHAR(12),
      screen_w     INT,
      duration_ms  INT
    );
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events (created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events (type, created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events (visitor_id, created_at);

    -- Sal diario do identificador de visitante. Sais antigos sao apagados,
    -- o que torna impossivel recalcular quem era quem depois de 2 dias.
    CREATE TABLE IF NOT EXISTS analytics_salts (
      day  DATE PRIMARY KEY,
      salt CHAR(64) NOT NULL
    );
  `);
}

const saltCache = new Map();

async function dailySalt() {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  if (saltCache.has(day)) return saltCache.get(day);
  const fresh = crypto.randomBytes(32).toString('hex');
  await pool.query('INSERT INTO analytics_salts (day, salt) VALUES ($1, $2) ON CONFLICT (day) DO NOTHING', [day, fresh]);
  const { rows } = await pool.query('SELECT salt FROM analytics_salts WHERE day = $1', [day]);
  saltCache.clear();
  saltCache.set(day, rows[0].salt);
  return rows[0].salt;
}

function clientIp(req) {
  const h = req.headers;
  const ip = h['cf-connecting-ip'] || h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '';
  return ip.trim().replace(/^::ffff:/, '');
}

// Mantem so a parte de rede do IP: /24 no IPv4 e /48 no IPv6.
function anonymizeIp(ip) {
  if (!ip) return null;
  if (ip.includes('.')) return ip.split('.').slice(0, 3).concat('0').join('.');
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::';
  return null;
}

function parseUa(ua = '') {
  let browser = 'Outro';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = 'Outro';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/.test(ua)) os = 'macOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let device = 'desktop';
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) device = 'tablet';
  else if (/Mobi|iPhone|Android/.test(ua)) device = 'mobile';

  return { browser, os, device };
}

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

function cut(v, n) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, n) : null;
}

function headerText(v) {
  if (!v) return null;
  // Cloudflare envia cidade/regiao com acentos codificados em latin1.
  try { return Buffer.from(String(v), 'latin1').toString('utf8'); } catch { return String(v); }
}

async function purgeOld() {
  await pool.query(`DELETE FROM analytics_events WHERE created_at < NOW() - ($1 || ' days')::interval`, [String(RETENTION_DAYS)]);
  await pool.query(`DELETE FROM analytics_salts WHERE day < (NOW() AT TIME ZONE '${TZ}')::date - 1`);
}

module.exports = {
  OWNER_EMAIL, ALLOWED_HOSTS, RETENTION_DAYS, TZ, BOT_RE,
  ensureSchema, dailySalt, clientIp, anonymizeIp, parseUa, hostOf, cut, headerText, purgeOld,
};

const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db/pool');
const { check } = require('../services/sites');

router.use(auth);

// Estado atual (ultima checagem) + disponibilidade e latencia em 24h e 7d.
const SUMMARY_SQL = `
  SELECT s.id, s.name, s.url, s.active,
         last.checked_at, last.ok, last.status_code, last.latency_ms, last.cert_days, last.error,
         d.uptime_24h, d.avg_latency_24h, w.uptime_7d,
         down.since AS down_since,
         inc.last_incident
    FROM sites s
    LEFT JOIN LATERAL (
      SELECT * FROM site_checks c WHERE c.site_id = s.id ORDER BY checked_at DESC LIMIT 1
    ) last ON true
    LEFT JOIN LATERAL (
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ok) / NULLIF(COUNT(*), 0), 2)::float AS uptime_24h,
             ROUND(AVG(latency_ms) FILTER (WHERE ok))::int AS avg_latency_24h
        FROM site_checks c WHERE c.site_id = s.id AND checked_at >= NOW() - interval '24 hours'
    ) d ON true
    LEFT JOIN LATERAL (
      SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE ok) / NULLIF(COUNT(*), 0), 2)::float AS uptime_7d
        FROM site_checks c WHERE c.site_id = s.id AND checked_at >= NOW() - interval '7 days'
    ) w ON true
    LEFT JOIN LATERAL (
      -- Desde quando esta fora: primeira falha depois do ultimo sucesso.
      SELECT MIN(checked_at) AS since FROM site_checks c
       WHERE c.site_id = s.id AND NOT ok
         AND checked_at > COALESCE((SELECT MAX(checked_at) FROM site_checks x WHERE x.site_id = s.id AND x.ok), 'epoch')
    ) down ON true
    LEFT JOIN LATERAL (
      SELECT MAX(checked_at) AS last_incident FROM site_checks c WHERE c.site_id = s.id AND NOT ok
    ) inc ON true`;

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`${SUMMARY_SQL} ORDER BY s.active DESC, last.ok ASC NULLS FIRST, s.name`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/history', async (req, res) => {
  const hours = Math.min(Math.max(Number.parseInt(req.query.hours, 10) || 24, 1), 720);
  const bucket = hours <= 24 ? '10 minutes' : hours <= 168 ? '1 hour' : '6 hours';
  try {
    const { rows } = await pool.query(
      `SELECT date_bin($3::interval, checked_at, TIMESTAMPTZ '2000-01-01') AS t,
              ROUND(AVG(latency_ms) FILTER (WHERE ok))::int AS latency,
              ROUND(100.0 * COUNT(*) FILTER (WHERE ok) / COUNT(*), 1)::float AS uptime
         FROM site_checks
        WHERE site_id = $1 AND checked_at >= NOW() - ($2 || ' hours')::interval
        GROUP BY t ORDER BY t`,
      [req.params.id, String(hours), bucket]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function normalizeUrl(u) {
  try {
    const url = new URL(String(u).trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

router.post('/', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 120);
  const url = normalizeUrl(req.body?.url);
  if (!name || !url) return res.status(400).json({ error: 'Informe nome e URL (http/https)' });
  try {
    const { rows } = await pool.query('INSERT INTO sites (name, url) VALUES ($1, $2) RETURNING *', [name, url]);
    const r = await check(url);
    await pool.query(
      `INSERT INTO site_checks (site_id, ok, status_code, latency_ms, cert_days, error) VALUES ($1,$2,$3,$4,$5,$6)`,
      [rows[0].id, r.ok, r.statusCode, r.latencyMs, r.certDays, r.error]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'URL já cadastrada' : err.message });
  }
});

router.put('/:id', async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 120);
  const url = normalizeUrl(req.body?.url);
  if (!name || !url) return res.status(400).json({ error: 'Informe nome e URL (http/https)' });
  try {
    const { rows } = await pool.query(
      'UPDATE sites SET name = $1, url = $2, active = $3 WHERE id = $4 RETURNING *',
      [name, url, req.body?.active !== false, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Site não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'URL já cadastrada' : err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sites WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

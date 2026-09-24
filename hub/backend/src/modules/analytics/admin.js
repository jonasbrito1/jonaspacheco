const router = require('express').Router();
const auth = require('../../middleware/auth');
const pool = require('../../db/pool');
const { OWNER_EMAIL, TZ } = require('./helpers');

// Alem do token valido, exige que o usuario seja o dono do painel. O e-mail
// e conferido no banco (nao so no token) para refletir alteracoes de cadastro.
async function ownerOnly(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if ((rows[0]?.email || '').trim().toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Acesso restrito' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.use(auth, ownerOnly);

function clampDays(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 365) : 30;
}

// Inicio do periodo: meia-noite (fuso de Manaus) de N-1 dias atras,
// ou as ultimas 24 horas quando o periodo e de 1 dia.
function sinceSql(days) {
  return days === 1
    ? `date_trunc('hour', NOW()) - interval '23 hours'`
    : `(((NOW() AT TIME ZONE '${TZ}')::date - ${days - 1})::timestamp AT TIME ZONE '${TZ}')`;
}

async function top(column, since, { type = 'pageview', limit = 10, where = '' } = {}) {
  const { rows } = await pool.query(
    `SELECT ${column} AS label, COUNT(DISTINCT visitor_id)::int AS visitors, COUNT(*)::int AS events
       FROM analytics_events
      WHERE created_at >= ${since} AND type = $1 AND ${column} IS NOT NULL ${where}
      GROUP BY 1 ORDER BY visitors DESC, events DESC LIMIT ${limit}`,
    [type]
  );
  return rows;
}

router.get('/summary', async (req, res) => {
  const days = clampDays(req.query.days);
  const since = sinceSql(days);
  try {
    const [kpi, realtime, today, series, referrers, countries, cities, devices, browsers, oses, langs, pages, clicks, utm] =
      await Promise.all([
        pool.query(`
          SELECT COUNT(*) FILTER (WHERE type = 'pageview')::int AS pageviews,
                 COUNT(DISTINCT visitor_id)::int                AS visitors,
                 COUNT(*) FILTER (WHERE type = 'click')::int    AS clicks,
                 COALESCE(ROUND(AVG(duration_ms) FILTER (WHERE type = 'leave' AND duration_ms BETWEEN 1000 AND 3600000)), 0)::int AS avg_duration_ms
            FROM analytics_events WHERE created_at >= ${since}`),
        pool.query(`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM analytics_events WHERE created_at >= NOW() - interval '5 minutes'`),
        pool.query(`
          SELECT COUNT(*) FILTER (WHERE type = 'pageview')::int AS pageviews, COUNT(DISTINCT visitor_id)::int AS visitors
            FROM analytics_events
           WHERE created_at >= (((NOW() AT TIME ZONE '${TZ}')::date)::timestamp AT TIME ZONE '${TZ}')`),
        days === 1
          ? pool.query(`
              SELECT to_char(b AT TIME ZONE '${TZ}', 'HH24"h"') AS bucket,
                     COALESCE(e.pageviews, 0)::int AS pageviews, COALESCE(e.visitors, 0)::int AS visitors
                FROM generate_series(${since}, date_trunc('hour', NOW()), interval '1 hour') b
                LEFT JOIN (
                  SELECT date_trunc('hour', created_at) AS h,
                         COUNT(*) FILTER (WHERE type = 'pageview') AS pageviews, COUNT(DISTINCT visitor_id) AS visitors
                    FROM analytics_events WHERE created_at >= ${since} GROUP BY 1
                ) e ON e.h = b
               ORDER BY b`)
          : pool.query(`
              SELECT to_char(d, 'DD/MM') AS bucket,
                     COALESCE(e.pageviews, 0)::int AS pageviews, COALESCE(e.visitors, 0)::int AS visitors
                FROM generate_series((NOW() AT TIME ZONE '${TZ}')::date - ${days - 1}, (NOW() AT TIME ZONE '${TZ}')::date, interval '1 day') d
                LEFT JOIN (
                  SELECT (created_at AT TIME ZONE '${TZ}')::date AS day,
                         COUNT(*) FILTER (WHERE type = 'pageview') AS pageviews, COUNT(DISTINCT visitor_id) AS visitors
                    FROM analytics_events WHERE created_at >= ${since} GROUP BY 1
                ) e ON e.day = d::date
               ORDER BY d`),
        top('referrer', since),
        top('country', since),
        top(`concat_ws(', ', city, region, country)`, since, { where: 'AND city IS NOT NULL' }),
        top('device', since),
        top('browser', since),
        top('os', since),
        top('lang', since),
        top('path', since),
        top('target', since, { type: 'click', limit: 15 }),
        top('utm_source', since),
      ]);

    res.json({
      days,
      kpis: { ...kpi.rows[0], realtime: realtime.rows[0].n, today: today.rows[0] },
      series: series.rows,
      referrers: referrers.rows,
      countries: countries.rows,
      cities: cities.rows,
      devices: devices.rows,
      browsers: browsers.rows,
      oses: oses.rows,
      langs: langs.rows,
      pages: pages.rows,
      clicks: clicks.rows,
      utm: utm.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Uma linha por visitante (o identificador muda a cada dia).
const VISITS_SQL = (since) => `
  SELECT visitor_id,
         MIN(created_at) AS first_seen,
         MAX(created_at) AS last_seen,
         COUNT(*) FILTER (WHERE type = 'pageview')::int AS pageviews,
         COUNT(*) FILTER (WHERE type = 'click')::int    AS clicks,
         ARRAY_REMOVE(ARRAY_AGG(DISTINCT target), NULL) AS targets,
         MAX(duration_ms)::int AS duration_ms,
         MAX(referrer)   AS referrer,
         MAX(utm_source) AS utm_source,
         MAX(country)    AS country,
         MAX(region)     AS region,
         MAX(city)       AS city,
         MAX(ip_anon)    AS ip_anon,
         MAX(device)     AS device,
         MAX(browser)    AS browser,
         MAX(os)         AS os,
         MAX(lang)       AS lang,
         MAX(screen_w)   AS screen_w
    FROM analytics_events
   WHERE created_at >= ${since}
   GROUP BY visitor_id
   ORDER BY last_seen DESC`;

router.get('/visits', async (req, res) => {
  const days = clampDays(req.query.days);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const since = sinceSql(days);
  try {
    const [list, total] = await Promise.all([
      pool.query(`${VISITS_SQL(since)} LIMIT $1 OFFSET $2`, [limit, (page - 1) * limit]),
      pool.query(`SELECT COUNT(DISTINCT visitor_id)::int AS n FROM analytics_events WHERE created_at >= ${since}`),
    ]);
    res.json({ data: list.rows, total: total.rows[0].n, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function csvCell(v) {
  if (v == null) return '';
  const s = Array.isArray(v) ? v.join(' | ') : v instanceof Date ? v.toISOString() : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get('/export.csv', async (req, res) => {
  const days = clampDays(req.query.days);
  try {
    const { rows } = await pool.query(`${VISITS_SQL(sinceSql(days))} LIMIT 10000`);
    const cols = ['first_seen', 'last_seen', 'pageviews', 'clicks', 'targets', 'duration_ms', 'referrer', 'utm_source',
      'country', 'region', 'city', 'ip_anon', 'device', 'browser', 'os', 'lang', 'screen_w'];
    const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(';'))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="acessos-${days}d.csv"`);
    res.send('﻿' + csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

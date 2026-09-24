const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db/pool');
const vps = require('../services/vps');
const { TZ } = require('../modules/analytics/helpers');

router.use(auth);

// Resumo para a tela inicial: um numero de cada modulo.
router.get('/', async (req, res) => {
  const todayStart = `(((NOW() AT TIME ZONE '${TZ}')::date)::timestamp AT TIME ZONE '${TZ}')`;
  try {
    const [access, sites, down, projects, notes, snapshot, spark] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) FILTER (WHERE type = 'pageview' AND created_at >= ${todayStart})::int AS pageviews_today,
               COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= ${todayStart})::int  AS visitors_today,
               COUNT(*) FILTER (WHERE type = 'pageview')::int                              AS pageviews_7d,
               COUNT(DISTINCT visitor_id)::int                                             AS visitors_7d,
               COUNT(DISTINCT visitor_id) FILTER (WHERE created_at >= NOW() - interval '5 minutes')::int AS realtime
          FROM analytics_events WHERE created_at >= NOW() - interval '7 days'`),
      pool.query(`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE last.ok)::int AS up,
               MIN(last.cert_days) AS min_cert_days
          FROM sites s
          LEFT JOIN LATERAL (SELECT ok, cert_days FROM site_checks c WHERE c.site_id = s.id ORDER BY checked_at DESC LIMIT 1) last ON true
         WHERE s.active`),
      pool.query(`
        SELECT s.name, s.url, last.error, last.status_code
          FROM sites s
          JOIN LATERAL (SELECT ok, error, status_code FROM site_checks c WHERE c.site_id = s.id ORDER BY checked_at DESC LIMIT 1) last ON true
         WHERE s.active AND NOT last.ok ORDER BY s.name`),
      pool.query(`SELECT status, COUNT(*)::int AS n FROM hub_projects GROUP BY status`),
      pool.query(`SELECT id, title, updated_at, pinned FROM hub_notes ORDER BY pinned DESC, updated_at DESC LIMIT 5`),
      vps.snapshot(),
      pool.query(`
        SELECT to_char(d, 'DD/MM') AS day, COALESCE(e.n, 0)::int AS visitors
          FROM generate_series((NOW() AT TIME ZONE '${TZ}')::date - 13, (NOW() AT TIME ZONE '${TZ}')::date, interval '1 day') d
          LEFT JOIN (SELECT (created_at AT TIME ZONE '${TZ}')::date AS day, COUNT(DISTINCT visitor_id) AS n
                       FROM analytics_events WHERE created_at >= NOW() - interval '15 days' GROUP BY 1) e ON e.day = d::date
         ORDER BY d`),
    ]);
    res.json({
      access: access.rows[0],
      accessSeries: spark.rows,
      sites: { ...sites.rows[0], down: down.rows },
      projects: projects.rows,
      notes: notes.rows,
      vps: snapshot,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

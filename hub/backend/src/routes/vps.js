const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db/pool');
const vps = require('../services/vps');

router.use(auth);

const WINDOWS = {
  '1h': ['1 hour', '1 minute'],
  '24h': ['24 hours', '15 minutes'],
  '7d': ['7 days', '1 hour'],
  '30d': ['30 days', '6 hours'],
};

router.get('/', async (req, res) => {
  try {
    const [snapshot, processes] = await Promise.all([vps.snapshot(), vps.processes()]);
    res.json({ available: vps.IS_LINUX, snapshot, processes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  const [interval, bucket] = WINDOWS[req.query.window] || WINDOWS['24h'];
  try {
    const { rows } = await pool.query(
      `SELECT date_bin($2::interval, at, TIMESTAMPTZ '2000-01-01') AS t,
              ROUND(AVG(cpu)::numeric, 1)::float AS cpu,
              ROUND(AVG(100.0 * mem_used / NULLIF(mem_total, 0))::numeric, 1)::float AS mem,
              ROUND(AVG(100.0 * disk_used / NULLIF(disk_total, 0))::numeric, 1)::float AS disk,
              ROUND(AVG(net_rx))::bigint AS rx,
              ROUND(AVG(net_tx))::bigint AS tx
         FROM vps_samples WHERE at >= NOW() - $1::interval
        GROUP BY t ORDER BY t`,
      [interval, bucket]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

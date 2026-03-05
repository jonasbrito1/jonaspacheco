const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.*, p.name as project_name
    FROM transactions t
    LEFT JOIN projects p ON t.project_id = p.id
    ORDER BY t.date DESC
  `);
  res.json(rows);
});

router.get('/summary', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type='receita' AND date_trunc('month', date) = date_trunc('month', NOW()) THEN amount END), 0) AS receita_mes,
      COALESCE(SUM(CASE WHEN type='despesa' AND date_trunc('month', date) = date_trunc('month', NOW()) THEN amount END), 0) AS despesa_mes,
      COALESCE(SUM(CASE WHEN type='receita' THEN amount ELSE -amount END), 0) AS saldo_total,
      COALESCE(SUM(CASE WHEN type='receita' AND paid=false THEN amount END), 0) AS a_receber
    FROM transactions
  `);
  res.json(rows[0]);
});

router.get('/monthly', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      to_char(date_trunc('month', date), 'Mon/YY') AS month,
      SUM(CASE WHEN type='receita' THEN amount ELSE 0 END) AS receita,
      SUM(CASE WHEN type='despesa' THEN amount ELSE 0 END) AS despesa
    FROM transactions
    WHERE date >= NOW() - INTERVAL '6 months'
    GROUP BY date_trunc('month', date)
    ORDER BY date_trunc('month', date)
  `);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { project_id, type, description, amount, date, paid } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO transactions (project_id, type, description, amount, date, paid)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [project_id || null, type, description, amount, date, paid || false]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { project_id, type, description, amount, date, paid } = req.body;
  const { rows } = await pool.query(
    `UPDATE transactions SET project_id=$1, type=$2, description=$3, amount=$4, date=$5, paid=$6
     WHERE id=$7 RETURNING *`,
    [project_id || null, type, description, amount, date, paid, req.params.id]
  );
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Não encontrado' });
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;

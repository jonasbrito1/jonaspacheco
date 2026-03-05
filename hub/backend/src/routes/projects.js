const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, client, status, technologies, description, deadline, monthly_value, url } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO projects (name, client, status, technologies, description, deadline, monthly_value, url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, client, status || 'em_desenvolvimento', technologies || [], description, deadline, monthly_value || 0, url]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name, client, status, technologies, description, deadline, monthly_value, url } = req.body;
  const { rows } = await pool.query(
    `UPDATE projects SET name=$1, client=$2, status=$3, technologies=$4, description=$5,
     deadline=$6, monthly_value=$7, url=$8 WHERE id=$9 RETURNING *`,
    [name, client, status, technologies, description, deadline, monthly_value, url, req.params.id]
  );
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Não encontrado' });
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;

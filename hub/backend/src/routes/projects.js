const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db/pool');

router.use(auth);

const STATUS = ['ativo', 'em_desenvolvimento', 'manutencao', 'pausado', 'concluido'];

function clean(body = {}) {
  const text = (v, n) => { const s = String(v ?? '').trim(); return s ? s.slice(0, n) : null; };
  const stack = Array.isArray(body.stack)
    ? body.stack
    : String(body.stack || '').split(',');
  return {
    name: text(body.name, 160),
    client: text(body.client, 160),
    status: STATUS.includes(body.status) ? body.status : 'ativo',
    url: text(body.url, 300),
    repo_url: text(body.repo_url, 300),
    stack: stack.map((s) => String(s).trim()).filter(Boolean).slice(0, 20),
    description: text(body.description, 20000),
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, (SELECT COUNT(*)::int FROM hub_notes n WHERE n.project_id = p.id) AS notes
        FROM hub_projects p
       ORDER BY array_position(ARRAY['em_desenvolvimento','ativo','manutencao','pausado','concluido']::varchar[], p.status), p.updated_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const p = clean(req.body);
  if (!p.name) return res.status(400).json({ error: 'Informe o nome do projeto' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO hub_projects (name, client, status, url, repo_url, stack, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [p.name, p.client, p.status, p.url, p.repo_url, p.stack, p.description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const p = clean(req.body);
  if (!p.name) return res.status(400).json({ error: 'Informe o nome do projeto' });
  try {
    const { rows } = await pool.query(
      `UPDATE hub_projects SET name=$1, client=$2, status=$3, url=$4, repo_url=$5, stack=$6, description=$7, updated_at=NOW()
        WHERE id=$8 RETURNING *`,
      [p.name, p.client, p.status, p.url, p.repo_url, p.stack, p.description, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM hub_projects WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

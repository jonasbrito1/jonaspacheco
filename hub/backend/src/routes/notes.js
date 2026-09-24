const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../db/pool');

router.use(auth);

function clean(body = {}) {
  const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',');
  const projectId = Number.parseInt(body.project_id, 10);
  return {
    title: String(body.title || '').trim().slice(0, 200),
    content: String(body.content || '').slice(0, 200000),
    tags: tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 20),
    pinned: body.pinned === true,
    project_id: Number.isFinite(projectId) ? projectId : null,
  };
}

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const tag = String(req.query.tag || '').trim().toLowerCase();
  const params = [];
  const where = [];
  if (q) { params.push(`%${q}%`); where.push(`(n.title ILIKE $${params.length} OR n.content ILIKE $${params.length})`); }
  if (tag) { params.push(tag); where.push(`$${params.length} = ANY(n.tags)`); }
  try {
    const { rows } = await pool.query(
      `SELECT n.*, p.name AS project_name FROM hub_notes n
         LEFT JOIN hub_projects p ON p.id = n.project_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY n.pinned DESC, n.updated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const n = clean(req.body);
  if (!n.title) return res.status(400).json({ error: 'Informe um título' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO hub_notes (title, content, tags, pinned, project_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [n.title, n.content, n.tags, n.pinned, n.project_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const n = clean(req.body);
  if (!n.title) return res.status(400).json({ error: 'Informe um título' });
  try {
    const { rows } = await pool.query(
      `UPDATE hub_notes SET title=$1, content=$2, tags=$3, pinned=$4, project_id=$5, updated_at=NOW()
        WHERE id=$6 RETURNING *`,
      [n.title, n.content, n.tags, n.pinned, n.project_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Anotação não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM hub_notes WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

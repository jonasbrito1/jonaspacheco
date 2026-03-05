const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
};

// GET - todos autenticados podem listar (necessário para atribuir tickets)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST - apenas admin
router.post('/', auth, adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hash, role || 'dev']
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT - apenas admin
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, email, role, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name=$1, email=$2, role=$3, password_hash=$4 WHERE id=$5', [name, email, role, hash, req.params.id]);
    } else {
      await pool.query('UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4', [name, email, role, req.params.id]);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE - apenas admin
router.delete('/:id', auth, adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Não pode excluir a si mesmo' });
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

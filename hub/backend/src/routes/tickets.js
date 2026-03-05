const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

// GET /api/tickets — lista todos
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*,
             p.name  AS project_name,
             u1.name AS assigned_name,
             u2.name AS creator_name
      FROM tickets t
      LEFT JOIN projects p  ON t.project_id  = p.id
      LEFT JOIN users u1    ON t.assigned_to  = u1.id
      LEFT JOIN users u2    ON t.created_by   = u2.id
      ORDER BY t.updated_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tickets/:id — detalhe com mensagens
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [ticket] } = await pool.query(`
      SELECT t.*,
             p.name  AS project_name,
             u1.name AS assigned_name,
             u2.name AS creator_name
      FROM tickets t
      LEFT JOIN projects p  ON t.project_id  = p.id
      LEFT JOIN users u1    ON t.assigned_to  = u1.id
      LEFT JOIN users u2    ON t.created_by   = u2.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const { rows: messages } = await pool.query(`
      SELECT tm.*, u.name AS user_name, u.role AS user_role
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = $1
      ORDER BY tm.created_at ASC
    `, [req.params.id]);

    res.json({ ...ticket, messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tickets — criar ticket
router.post('/', auth, async (req, res) => {
  const { title, description, project_id, priority, client_name, client_email } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, project_id, priority, client_name, client_email, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, project_id || null, priority || 'media', client_name || null, client_email || null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tickets/:id — atualizar status, prioridade, atribuição
router.put('/:id', auth, async (req, res) => {
  const { title, status, priority, assigned_to, project_id } = req.body;
  try {
    await pool.query(
      `UPDATE tickets SET title=$1, status=$2, priority=$3, assigned_to=$4, project_id=$5, updated_at=NOW() WHERE id=$6`,
      [title, status, priority, assigned_to || null, project_id || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tickets/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tickets WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tickets/:id/messages — adicionar mensagem
router.post('/:id/messages', auth, async (req, res) => {
  const { message } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, author_name, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, req.user.name || req.user.email, message]
    );
    await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

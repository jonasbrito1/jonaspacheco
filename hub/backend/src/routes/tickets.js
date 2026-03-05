const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { notifyNewTicket, notifyClientReply, notifyClientStatus } = require('../services/mailer');

const SELECT_TICKET = `
  SELECT t.*,
         p.name  AS project_name,
         u1.name AS assigned_name, u1.email AS assigned_email,
         u2.name AS creator_name
  FROM tickets t
  LEFT JOIN projects p  ON t.project_id  = p.id
  LEFT JOIN users u1    ON t.assigned_to  = u1.id
  LEFT JOIN users u2    ON t.created_by   = u2.id
`;

// POST /api/tickets/public — endpoint sem auth para contact form (X-Api-Key)
router.post('/public', async (req, res) => {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.PUBLIC_TICKET_KEY)
    return res.status(403).json({ error: 'Chave inválida' });

  const { title, description, client_name, client_email, category, urgency } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, client_name, client_email, category, urgency, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6, 'aberto', 'media') RETURNING *`,
      [title, description || null, client_name || null, client_email || null,
       category || 'suporte', urgency || 'media']
    );
    notifyNewTicket(rows[0]); // fire-and-forget
    res.json({ ok: true, id: rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tickets
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(SELECT_TICKET + ' ORDER BY t.updated_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tickets/:id — com mensagens
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: [ticket] } = await pool.query(SELECT_TICKET + ' WHERE t.id = $1', [req.params.id]);
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

// POST /api/tickets — criar ticket interno
router.post('/', auth, async (req, res) => {
  const { title, description, project_id, priority, urgency, category, client_name, client_email, assigned_to } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, project_id, priority, urgency, category, client_name, client_email, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, description || null, project_id || null,
       priority || 'media', urgency || 'media', category || 'suporte',
       client_name || null, client_email || null,
       assigned_to || null, req.user.id]
    );
    notifyNewTicket(rows[0]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tickets/:id — atualizar
router.put('/:id', auth, async (req, res) => {
  const { title, status, priority, urgency, category, assigned_to, project_id } = req.body;
  try {
    // Buscar ticket antes para notificação de status
    const { rows: [before] } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);

    await pool.query(
      `UPDATE tickets SET title=$1, status=$2, priority=$3, urgency=$4, category=$5,
       assigned_to=$6, project_id=$7, updated_at=NOW() WHERE id=$8`,
      [title, status, priority, urgency || 'media', category || 'suporte',
       assigned_to || null, project_id || null, req.params.id]
    );

    // Notificar cliente se status mudou para resolvido/fechado
    if (before && before.status !== status && ['resolvido', 'fechado'].includes(status)) {
      notifyClientStatus(before, status);
    }
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

// POST /api/tickets/:id/messages — adicionar mensagem/nota
router.post('/:id/messages', auth, async (req, res) => {
  const { message, is_internal } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, author_name, message, is_internal)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, req.user.id, req.user.name || req.user.email, message, is_internal || false]
    );
    await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1', [req.params.id]);

    // Notificar cliente apenas em respostas públicas
    if (!is_internal) {
      const { rows: [ticket] } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
      if (ticket) notifyClientReply(ticket, message);
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

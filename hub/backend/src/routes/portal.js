/**
 * Portal público de suporte — suporte.jonaspacheco.cloud
 * Rotas sem necessidade de autenticação de hub (usa client_users separado)
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db/pool');
const { notifyNewTicket, notifyClientReply, notifyPortalConfirmation } = require('../services/mailer');

// Multer para anexos de clientes
const uploadDir = path.join(__dirname, '../../../uploads/tickets');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|txt|zip|doc|docx|xls|xlsx/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// Middleware JWT de cliente
function clientAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.client = jwt.verify(h.replace('Bearer ', ''), process.env.JWT_SECRET + '_client');
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ──────────────────────────────────────────────
// AUTH DE CLIENTE
// ──────────────────────────────────────────────

// POST /api/portal/auth/register
router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO client_users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email`,
      [name, email, hash]
    );
    const token = jwt.sign({ id: rows[0].id, email, name }, process.env.JWT_SECRET + '_client', { expiresIn: '30d' });
    res.json({ token, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portal/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  try {
    const { rows } = await pool.query('SELECT * FROM client_users WHERE email = $1', [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash)))
      return res.status(401).json({ error: 'Credenciais inválidas' });
    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email, name: rows[0].name },
      process.env.JWT_SECRET + '_client',
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: rows[0].id, name: rows[0].name, email: rows[0].email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// ABRIR TICKET (sem login — apenas email)
// ──────────────────────────────────────────────

// POST /api/portal/tickets
router.post('/tickets', upload.single('attachment'), async (req, res) => {
  const { title, description, name, email, category, urgency } = req.body;
  if (!title || !email || !name)
    return res.status(400).json({ error: 'Título, nome e email obrigatórios' });

  let attachment_url = null, attachment_name = null, attachment_type = null;
  if (req.file) {
    attachment_url = `/uploads/tickets/${req.file.filename}`;
    attachment_name = req.file.originalname;
    attachment_type = req.file.mimetype;
  }

  try {
    // Verificar se já existe client_user com esse email
    const { rows: cu } = await pool.query('SELECT id FROM client_users WHERE email = $1', [email]);
    const client_user_id = cu[0]?.id || null;

    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, client_name, client_email, category, urgency, status, priority, client_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'aberto', 'media', $7) RETURNING *`,
      [title, description || null, name, email, category || 'suporte', urgency || 'media', client_user_id]
    );
    const ticket = rows[0];

    // Adicionar descrição como primeira mensagem se vier com anexo
    if (attachment_url) {
      await pool.query(
        `INSERT INTO ticket_messages (ticket_id, author_name, message, is_internal, attachment_url, attachment_name, attachment_type)
         VALUES ($1, $2, $3, false, $4, $5, $6)`,
        [ticket.id, name, description || '', attachment_url, attachment_name, attachment_type]
      );
    }

    notifyNewTicket(ticket);
    notifyPortalConfirmation(ticket);

    res.json({
      ok: true,
      id: ticket.id,
      token: ticket.ticket_token,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// ACOMPANHAR POR TOKEN (sem login)
// ──────────────────────────────────────────────

// GET /api/portal/track/:token
router.get('/track/:token', async (req, res) => {
  try {
    const { rows: [ticket] } = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tickets t LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.ticket_token = $1`,
      [req.params.token]
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const { rows: messages } = await pool.query(
      `SELECT tm.*, u.name AS user_name
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.ticket_id = $1 AND tm.is_internal = false
       ORDER BY tm.created_at ASC`,
      [ticket.id]
    );

    res.json({ ...ticket, messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/portal/track/:token/reply — cliente responde pelo token
router.post('/track/:token/reply', upload.single('attachment'), async (req, res) => {
  const { message } = req.body;
  if (!message && !req.file) return res.status(400).json({ error: 'Mensagem ou anexo obrigatório' });

  let attachment_url = null, attachment_name = null, attachment_type = null;
  if (req.file) {
    attachment_url = `/uploads/tickets/${req.file.filename}`;
    attachment_name = req.file.originalname;
    attachment_type = req.file.mimetype;
  }

  try {
    const { rows: [ticket] } = await pool.query('SELECT * FROM tickets WHERE ticket_token = $1', [req.params.token]);
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });
    if (['resolvido', 'fechado'].includes(ticket.status))
      return res.status(400).json({ error: 'Ticket encerrado. Abra um novo chamado.' });

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, author_name, message, is_internal, attachment_url, attachment_name, attachment_type)
       VALUES ($1, $2, $3, false, $4, $5, $6)`,
      [ticket.id, ticket.client_name, message || '', attachment_url, attachment_name, attachment_type]
    );
    await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1', [ticket.id]);

    // Notificar Jonas que o cliente respondeu
    const { notifyNewTicket: notify } = require('../services/mailer');
    const { notifyClientReply } = require('../services/mailer');
    // Reuse notifyClientReply mas invertido (Jonas é o "client" a ser notificado)
    const { sendClientReplyToAdmin } = require('../services/mailer');
    if (sendClientReplyToAdmin) sendClientReplyToAdmin(ticket, message || '[Anexo]', attachment_name);

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ──────────────────────────────────────────────
// ÁREA DO CLIENTE LOGADO
// ──────────────────────────────────────────────

// GET /api/portal/my
router.get('/my', clientAuth, async (req, res) => {
  try {
    // Buscar tickets pelo client_user_id OU pelo email
    const { rows } = await pool.query(
      `SELECT t.*, p.name AS project_name
       FROM tickets t LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.client_user_id = $1 OR t.client_email = $2
       ORDER BY t.updated_at DESC`,
      [req.client.id, req.client.email]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/portal/my/:id
router.get('/my/:id', clientAuth, async (req, res) => {
  try {
    const { rows: [ticket] } = await pool.query(
      `SELECT t.*, p.name AS project_name FROM tickets t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1 AND (t.client_user_id = $2 OR t.client_email = $3)`,
      [req.params.id, req.client.id, req.client.email]
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });

    const { rows: messages } = await pool.query(
      `SELECT tm.*, u.name AS user_name FROM ticket_messages tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.ticket_id = $1 AND tm.is_internal = false
       ORDER BY tm.created_at ASC`,
      [ticket.id]
    );
    res.json({ ...ticket, messages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/portal/my/:id/reply — resposta autenticada
router.post('/my/:id/reply', clientAuth, upload.single('attachment'), async (req, res) => {
  const { message } = req.body;
  if (!message && !req.file) return res.status(400).json({ error: 'Mensagem obrigatória' });

  let attachment_url = null, attachment_name = null, attachment_type = null;
  if (req.file) {
    attachment_url = `/uploads/tickets/${req.file.filename}`;
    attachment_name = req.file.originalname;
    attachment_type = req.file.mimetype;
  }

  try {
    const { rows: [ticket] } = await pool.query(
      `SELECT * FROM tickets WHERE id = $1 AND (client_user_id = $2 OR client_email = $3)`,
      [req.params.id, req.client.id, req.client.email]
    );
    if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });
    if (['resolvido', 'fechado'].includes(ticket.status))
      return res.status(400).json({ error: 'Ticket encerrado.' });

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, author_name, message, is_internal, attachment_url, attachment_name, attachment_type)
       VALUES ($1, $2, $3, false, $4, $5, $6)`,
      [ticket.id, req.client.name, message || '', attachment_url, attachment_name, attachment_type]
    );
    await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1', [ticket.id]);

    const { sendClientReplyToAdmin } = require('../services/mailer');
    if (sendClientReplyToAdmin) sendClientReplyToAdmin(ticket, message || '[Anexo]', attachment_name);

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

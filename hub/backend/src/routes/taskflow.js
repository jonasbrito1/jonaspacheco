const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

// ── Multer para anexos de tarefas ──────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../../uploads/tasks');
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|txt|zip|doc|docx|xls|xlsx|mp4|mov/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────
async function nextPosition(table, fk, fkValue) {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(position), 0) + 1000 AS pos FROM ${table} WHERE ${fk} = $1`,
    [fkValue]
  );
  return rows[0].pos;
}

function midPosition(a, b) {
  return (a + b) / 2;
}

// ══════════════════════════════════════════════════════════════════════════════
// BOARDS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/tf/boards
router.get('/boards', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*,
             p.name AS project_name,
             u.name AS creator_name,
             (SELECT COUNT(*) FROM tf_tasks t WHERE t.board_id = b.id AND t.deleted_at IS NULL AND t.parent_id IS NULL) AS task_count,
             (SELECT COUNT(*) FROM tf_tasks t
              JOIN tf_columns c ON t.column_id = c.id
              WHERE t.board_id = b.id AND t.deleted_at IS NULL AND t.parent_id IS NULL AND c.is_done = true) AS done_count
      FROM tf_boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN users u    ON b.created_by = u.id
      ORDER BY b.updated_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tf/boards
router.post('/boards', async (req, res) => {
  const { name, description, project_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tf_boards (name, description, project_id, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, project_id || null, req.user.id]
    );
    // Criar colunas padrão
    const board = rows[0];
    const defaultCols = [
      { name: 'A fazer',      color: '#475569', pos: 1000, done: false },
      { name: 'Em andamento', color: '#f59e0b', pos: 2000, done: false },
      { name: 'Concluído',    color: '#10b981', pos: 3000, done: true  },
    ];
    for (const col of defaultCols) {
      await pool.query(
        `INSERT INTO tf_columns (board_id, name, color, position, is_done) VALUES ($1, $2, $3, $4, $5)`,
        [board.id, col.name, col.color, col.pos, col.done]
      );
    }
    res.status(201).json(board);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tf/boards/:id  — board + colunas + tasks (kanban data)
router.get('/boards/:id', async (req, res) => {
  try {
    const { rows: [board] } = await pool.query(`
      SELECT b.*, p.name AS project_name, u.name AS creator_name
      FROM tf_boards b
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN users u    ON b.created_by = u.id
      WHERE b.id = $1
    `, [req.params.id]);
    if (!board) return res.status(404).json({ error: 'Board não encontrado' });

    const { rows: columns } = await pool.query(
      `SELECT * FROM tf_columns WHERE board_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );

    const { rows: tasks } = await pool.query(`
      SELECT t.*,
             u.name AS creator_name,
             (SELECT COUNT(*) FROM tf_tasks s WHERE s.parent_id = t.id AND s.deleted_at IS NULL) AS subtask_count,
             (SELECT COUNT(*) FROM tf_comments c WHERE c.task_id = t.id) AS comment_count,
             (SELECT COUNT(*) FROM tf_attachments a WHERE a.task_id = t.id) AS attachment_count,
             (SELECT EXISTS(SELECT 1 FROM tf_time_entries e WHERE e.task_id = t.id AND e.is_running = true AND e.user_id = $2)) AS timer_running
      FROM tf_tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.board_id = $1 AND t.deleted_at IS NULL AND t.parent_id IS NULL
      ORDER BY t.position ASC
    `, [req.params.id, req.user.id]);

    // Carregar assignees e labels para todas as tasks
    const taskIds = tasks.map(t => t.id);
    let assigneesMap = {}, labelsMap = {};
    if (taskIds.length > 0) {
      const { rows: assignees } = await pool.query(`
        SELECT ta.task_id, u.id, u.name, u.email
        FROM tf_task_assignees ta JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = ANY($1)
      `, [taskIds]);
      assignees.forEach(a => {
        if (!assigneesMap[a.task_id]) assigneesMap[a.task_id] = [];
        assigneesMap[a.task_id].push({ id: a.id, name: a.name, email: a.email });
      });

      const { rows: labels } = await pool.query(`
        SELECT tl.task_id, l.id, l.name, l.color
        FROM tf_task_labels tl JOIN tf_labels l ON tl.label_id = l.id
        WHERE tl.task_id = ANY($1)
      `, [taskIds]);
      labels.forEach(l => {
        if (!labelsMap[l.task_id]) labelsMap[l.task_id] = [];
        labelsMap[l.task_id].push({ id: l.id, name: l.name, color: l.color });
      });
    }

    const enrichedTasks = tasks.map(t => ({
      ...t,
      assignees: assigneesMap[t.id] || [],
      labels: labelsMap[t.id] || [],
    }));

    const { rows: boardLabels } = await pool.query(
      `SELECT * FROM tf_labels WHERE board_id = $1 ORDER BY name`,
      [req.params.id]
    );

    res.json({ ...board, columns, tasks: enrichedTasks, labels: boardLabels });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tf/boards/:id
router.put('/boards/:id', async (req, res) => {
  const { name, description, project_id } = req.body;
  try {
    await pool.query(
      `UPDATE tf_boards SET name=$1, description=$2, project_id=$3, updated_at=NOW() WHERE id=$4`,
      [name, description || null, project_id || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tf/boards/:id
router.delete('/boards/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tf_boards WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// COLUNAS
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/tf/boards/:boardId/columns
router.post('/boards/:boardId/columns', async (req, res) => {
  const { name, color, is_done } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const pos = await nextPosition('tf_columns', 'board_id', req.params.boardId);
    const { rows } = await pool.query(
      `INSERT INTO tf_columns (board_id, name, color, position, is_done) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.boardId, name, color || '#475569', pos, is_done || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tf/columns/:id
router.put('/columns/:id', async (req, res) => {
  const { name, color, position, is_done } = req.body;
  try {
    await pool.query(
      `UPDATE tf_columns SET name=COALESCE($1,name), color=COALESCE($2,color),
       position=COALESCE($3,position), is_done=COALESCE($4,is_done) WHERE id=$5`,
      [name, color, position, is_done, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tf/columns/:id
router.delete('/columns/:id', async (req, res) => {
  try {
    // Mover tasks órfãs para null column (não deletar)
    await pool.query(`UPDATE tf_tasks SET column_id = NULL WHERE column_id = $1`, [req.params.id]);
    await pool.query('DELETE FROM tf_columns WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/tf/tasks
router.get('/tasks', async (req, res) => {
  const { board_id, column_id, priority, search, assigned_to } = req.query;
  try {
    let where = ['t.deleted_at IS NULL', 't.parent_id IS NULL'];
    let params = [];
    let i = 1;

    if (board_id)    { where.push(`t.board_id = $${i++}`);   params.push(board_id); }
    if (column_id)   { where.push(`t.column_id = $${i++}`);  params.push(column_id); }
    if (priority)    { where.push(`t.priority = $${i++}`);    params.push(priority); }
    if (assigned_to) {
      where.push(`EXISTS(SELECT 1 FROM tf_task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $${i++})`);
      params.push(assigned_to);
    }
    if (search) {
      where.push(`t.title ILIKE $${i++}`);
      params.push(`%${search}%`);
    }

    const { rows } = await pool.query(`
      SELECT t.*, c.name AS column_name, c.color AS column_color,
             (SELECT COUNT(*) FROM tf_tasks s WHERE s.parent_id = t.id AND s.deleted_at IS NULL) AS subtask_count
      FROM tf_tasks t
      LEFT JOIN tf_columns c ON t.column_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY t.position ASC
    `, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tf/tasks
router.post('/tasks', async (req, res) => {
  const { board_id, column_id, parent_id, title, description, priority, due_date } = req.body;
  if (!title || !board_id) return res.status(400).json({ error: 'Título e board obrigatórios' });
  try {
    const fk = parent_id ? 'parent_id' : 'column_id';
    const fkVal = parent_id || column_id;
    const pos = fkVal ? await nextPosition('tf_tasks', fk, fkVal) : 1000;

    const { rows } = await pool.query(
      `INSERT INTO tf_tasks (board_id, column_id, parent_id, title, description, priority, due_date, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [board_id, column_id || null, parent_id || null, title, description || null,
       priority || 'none', due_date || null, pos, req.user.id]
    );
    await pool.query('UPDATE tf_boards SET updated_at=NOW() WHERE id=$1', [board_id]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tf/tasks/:id — detalhe completo
router.get('/tasks/:id', async (req, res) => {
  try {
    const { rows: [task] } = await pool.query(`
      SELECT t.*, c.name AS column_name, c.color AS column_color, c.is_done,
             u.name AS creator_name, b.name AS board_name
      FROM tf_tasks t
      LEFT JOIN tf_columns c ON t.column_id = c.id
      LEFT JOIN users u      ON t.created_by = u.id
      LEFT JOIN tf_boards b  ON t.board_id = b.id
      WHERE t.id = $1 AND t.deleted_at IS NULL
    `, [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const [assignees, labels, comments, attachments, subtasks, timeEntries] = await Promise.all([
      pool.query(`SELECT u.id, u.name, u.email FROM tf_task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = $1`, [task.id]),
      pool.query(`SELECT l.* FROM tf_task_labels tl JOIN tf_labels l ON tl.label_id = l.id WHERE tl.task_id = $1`, [task.id]),
      pool.query(`
        SELECT c.*, u.name AS user_name
        FROM tf_comments c LEFT JOIN users u ON c.user_id = u.id
        WHERE c.task_id = $1 AND c.parent_id IS NULL ORDER BY c.created_at ASC
      `, [task.id]),
      pool.query(`SELECT * FROM tf_attachments WHERE task_id = $1 ORDER BY created_at DESC`, [task.id]),
      pool.query(`
        SELECT t.*,
               (SELECT COUNT(*) FROM tf_tasks s WHERE s.parent_id = t.id AND s.deleted_at IS NULL) AS subtask_count,
               c.is_done AS column_done
        FROM tf_tasks t LEFT JOIN tf_columns c ON t.column_id = c.id
        WHERE t.parent_id = $1 AND t.deleted_at IS NULL ORDER BY t.position ASC
      `, [task.id]),
      pool.query(`
        SELECT e.*, u.name AS user_name
        FROM tf_time_entries e LEFT JOIN users u ON e.user_id = u.id
        WHERE e.task_id = $1 ORDER BY e.created_at DESC LIMIT 20
      `, [task.id]),
    ]);

    // Timer ativo do usuário atual
    const { rows: [runningTimer] } = await pool.query(
      `SELECT * FROM tf_time_entries WHERE task_id=$1 AND user_id=$2 AND is_running=true LIMIT 1`,
      [task.id, req.user.id]
    );

    res.json({
      ...task,
      assignees: assignees.rows,
      labels: labels.rows,
      comments: comments.rows,
      attachments: attachments.rows,
      subtasks: subtasks.rows,
      time_entries: timeEntries.rows,
      running_timer: runningTimer || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/tf/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  const { title, description, column_id, priority, due_date } = req.body;
  try {
    await pool.query(
      `UPDATE tf_tasks SET title=COALESCE($1,title), description=$2, column_id=COALESCE($3,column_id),
       priority=COALESCE($4,priority), due_date=$5, updated_at=NOW() WHERE id=$6`,
      [title, description !== undefined ? description : null, column_id, priority, due_date || null, req.params.id]
    );
    // Atualizar updated_at do board
    const { rows: [t] } = await pool.query('SELECT board_id FROM tf_tasks WHERE id=$1', [req.params.id]);
    if (t) await pool.query('UPDATE tf_boards SET updated_at=NOW() WHERE id=$1', [t.board_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/tf/tasks/:id/move — drag & drop
router.patch('/tasks/:id/move', async (req, res) => {
  const { column_id, position } = req.body;
  try {
    await pool.query(
      `UPDATE tf_tasks SET column_id=$1, position=$2, updated_at=NOW() WHERE id=$3`,
      [column_id, position, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tf/tasks/:id — soft delete
router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE tf_tasks SET deleted_at=NOW() WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ASSIGNEES
// ══════════════════════════════════════════════════════════════════════════════

router.post('/tasks/:id/assignees', async (req, res) => {
  const { user_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO tf_task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, user_id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tasks/:id/assignees/:userId', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM tf_task_assignees WHERE task_id=$1 AND user_id=$2`,
      [req.params.id, req.params.userId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LABELS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/boards/:boardId/labels', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM tf_labels WHERE board_id=$1 ORDER BY name`, [req.params.boardId]);
  res.json(rows);
});

router.post('/boards/:boardId/labels', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query(
    `INSERT INTO tf_labels (board_id, name, color) VALUES ($1, $2, $3) RETURNING *`,
    [req.params.boardId, name, color || '#475569']
  );
  res.status(201).json(rows[0]);
});

router.delete('/labels/:id', async (req, res) => {
  await pool.query('DELETE FROM tf_labels WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

router.post('/tasks/:id/labels/:labelId', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO tf_task_labels (task_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.labelId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tasks/:id/labels/:labelId', async (req, res) => {
  await pool.query(`DELETE FROM tf_task_labels WHERE task_id=$1 AND label_id=$2`, [req.params.id, req.params.labelId]);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMENTÁRIOS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/tasks/:id/comments', async (req, res) => {
  const { content, parent_id } = req.body;
  if (!content) return res.status(400).json({ error: 'Comentário vazio' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tf_comments (task_id, user_id, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, content, parent_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/comments/:id', async (req, res) => {
  const { content } = req.body;
  try {
    await pool.query(
      `UPDATE tf_comments SET content=$1, updated_at=NOW() WHERE id=$2 AND user_id=$3`,
      [content, req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/comments/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM tf_comments WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// ANEXOS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/tasks/:id/attachments', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Arquivo obrigatório' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tf_attachments (task_id, user_id, filename, file_url, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, req.user.id, file.originalname,
       `/uploads/tasks/${file.filename}`, file.size, file.mimetype]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    const { rows: [att] } = await pool.query('SELECT * FROM tf_attachments WHERE id=$1', [req.params.id]);
    if (!att) return res.status(404).json({ error: 'Anexo não encontrado' });
    // Deletar arquivo físico
    const fullPath = path.join(__dirname, '../../../', att.file_url);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await pool.query('DELETE FROM tf_attachments WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// TIME TRACKING
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/tf/tasks/:id/timer/start
router.post('/tasks/:id/timer/start', async (req, res) => {
  try {
    // Parar qualquer timer rodando desse usuário em qualquer task
    await pool.query(`
      UPDATE tf_time_entries
      SET is_running = false,
          ended_at = NOW(),
          duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
      WHERE user_id = $1 AND is_running = true
    `, [req.user.id]);

    const { rows } = await pool.query(
      `INSERT INTO tf_time_entries (task_id, user_id, started_at, is_running)
       VALUES ($1, $2, NOW(), true) RETURNING *`,
      [req.params.id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tf/tasks/:id/timer/stop
router.post('/tasks/:id/timer/stop', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE tf_time_entries
      SET is_running = false,
          ended_at = NOW(),
          duration_minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (NOW() - started_at)) / 60))
      WHERE task_id = $1 AND user_id = $2 AND is_running = true
      RETURNING *
    `, [req.params.id, req.user.id]);
    res.json(rows[0] || { ok: true, message: 'Nenhum timer ativo' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/tf/tasks/:id/time
router.get('/tasks/:id/time', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT e.*, u.name AS user_name
      FROM tf_time_entries e LEFT JOIN users u ON e.user_id = u.id
      WHERE e.task_id = $1 ORDER BY e.created_at DESC
    `, [req.params.id]);
    const total = rows.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    res.json({ entries: rows, total_minutes: total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/tf/tasks/:id/time — lançamento manual
router.post('/tasks/:id/time', async (req, res) => {
  const { description, duration_minutes } = req.body;
  if (!duration_minutes || duration_minutes < 1) return res.status(400).json({ error: 'Duração inválida' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO tf_time_entries (task_id, user_id, description, duration_minutes, started_at, ended_at)
       VALUES ($1, $2, $3, $4, NOW() - ($4 || ' minutes')::interval, NOW()) RETURNING *`,
      [req.params.id, req.user.id, description || null, duration_minutes]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/tf/time/:id
router.delete('/time/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM tf_time_entries WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

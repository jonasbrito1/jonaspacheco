const router = require('express').Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const [projects, finance, recent] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN status='em_desenvolvimento' THEN 1 END) AS ativos,
        COUNT(CASE WHEN status='concluido' THEN 1 END) AS concluidos,
        COUNT(CASE WHEN status='manutencao' THEN 1 END) AS manutencao
      FROM projects
    `),
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='receita' AND date_trunc('month',date)=date_trunc('month',NOW()) THEN amount END),0) AS receita_mes,
        COALESCE(SUM(CASE WHEN type='despesa' AND date_trunc('month',date)=date_trunc('month',NOW()) THEN amount END),0) AS despesa_mes,
        COALESCE(SUM(CASE WHEN type='receita' AND paid=false THEN amount END),0) AS a_receber
      FROM transactions
    `),
    pool.query(`
      SELECT t.description, t.amount, t.type, t.date, p.name as project_name
      FROM transactions t LEFT JOIN projects p ON t.project_id=p.id
      ORDER BY t.created_at DESC LIMIT 5
    `)
  ]);
  res.json({
    projects: projects.rows[0],
    finance: finance.rows[0],
    recent_transactions: recent.rows
  });
});

module.exports = router;

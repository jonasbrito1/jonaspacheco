/**
 * Autenticacao do hub pessoal. O hub tem um unico dono: alem do JWT valido,
 * o e-mail do usuario e conferido no banco a cada requisicao, e um token
 * emitido antes da ultima troca de senha deixa de valer.
 */
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const OWNER_EMAIL = (process.env.OWNER_EMAIL || process.env.ANALYTICS_OWNER_EMAIL || 'jonasbrito1a@gmail.com')
  .trim().toLowerCase();

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sessão expirada' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, name, password_changed_at FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = rows[0];
    if (!user || user.email.trim().toLowerCase() !== OWNER_EMAIL) {
      return res.status(403).json({ error: 'Acesso restrito' });
    }
    const changed = user.password_changed_at ? Math.floor(new Date(user.password_changed_at).getTime() / 1000) : 0;
    if (decoded.iat < changed) return res.status(401).json({ error: 'Sessão expirada' });
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada' });
  }
}

module.exports = auth;
module.exports.OWNER_EMAIL = OWNER_EMAIL;

const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Tokens antigos não têm role/name — busca do banco
    if (!decoded.role) {
      const { rows } = await pool.query('SELECT name, role FROM users WHERE id = $1', [decoded.id]);
      decoded.role = rows[0]?.role || 'admin';
      decoded.name = rows[0]?.name || decoded.email;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

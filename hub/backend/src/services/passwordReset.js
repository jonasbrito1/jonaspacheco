/**
 * Tokens de redefinicao de senha: so o sha256 fica no banco, valem 60
 * minutos, servem uma vez, e usar um invalida os outros pendentes.
 */
const crypto = require('crypto');
const pool = require('../db/pool');

const VALIDITY_MIN = 60;
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function create(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM password_resets WHERE user_id = $1 AND created_at > NOW() - interval '15 minutes'`,
    [userId]
  );
  if (rows[0].n >= 3) return null;
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + interval '${VALIDITY_MIN} minutes')`,
    [userId, hash(token)]
  );
  return token;
}

async function find(token) {
  if (!token || token.length > 100) return null;
  const { rows } = await pool.query(
    `SELECT r.id, r.user_id, u.email FROM password_resets r JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > NOW()`,
    [hash(token)]
  );
  return rows[0] || null;
}

async function consume(resetId, userId) {
  await pool.query('UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);
  return resetId;
}

module.exports = { create, find, consume };

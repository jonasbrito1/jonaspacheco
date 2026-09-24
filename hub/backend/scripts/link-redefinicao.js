/**
 * Gera um link de redefinicao de senha para o dono do hub, sem depender de
 * e-mail. Uso na VPS, dentro de hub/backend:
 *
 *   node scripts/link-redefinicao.js
 *
 * O link vale 60 minutos e serve uma vez.
 */
require('dotenv').config();
const pool = require('../src/db/pool');
const { OWNER_EMAIL } = require('../src/middleware/auth');
const resets = require('../src/services/passwordReset');

(async () => {
  const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [OWNER_EMAIL]);
  if (!rows[0]) throw new Error(`Usuário ${OWNER_EMAIL} não existe no banco`);
  const token = await resets.create(rows[0].id);
  if (!token) throw new Error('Limite de 3 pedidos em 15 minutos atingido');
  console.log(`${process.env.HUB_URL || 'https://hub.jonaspacheco.cloud'}/redefinir-senha?token=${token}`);
  await pool.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

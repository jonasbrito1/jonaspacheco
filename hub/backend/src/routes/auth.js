const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { OWNER_EMAIL } = require('../middleware/auth');
const resets = require('../services/passwordReset');
const { sendMail, resetEmail } = require('../services/mailer');

const HUB_URL = process.env.HUB_URL || 'https://hub.jonaspacheco.cloud';
const SESSION = '12h';

// Limite de tentativas de login: 5 falhas por IP em 15 minutos.
const failures = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, f] of failures) if (now - f.first > 15 * 60 * 1000) failures.delete(ip);
}, 60 * 1000).unref();

function clientIp(req) {
  return req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
}

function sign(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: SESSION });
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name || 'Jonas Pacheco' };
}

function validPassword(p) {
  return typeof p === 'string' && p.length >= 10 && p.length <= 200;
}

router.post('/login', async (req, res) => {
  const ip = clientIp(req);
  const f = failures.get(ip);
  if (f && f.count >= 5) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
    const user = rows[0];
    const ok = user && email === OWNER_EMAIL && await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      failures.set(ip, { count: (f?.count || 0) + 1, first: f?.first || Date.now() });
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }
    failures.delete(ip);
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth] login:', err.message);
    res.status(500).json({ error: 'Falha ao entrar' });
  }
});

router.get('/me', auth, (req, res) => res.json(publicUser(req.user)));

router.put('/password', auth, async (req, res) => {
  const { current, next } = req.body || {};
  if (!validPassword(next)) return res.status(400).json({ error: 'A nova senha precisa ter ao menos 10 caracteres' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!await bcrypt.compare(String(current || ''), rows[0].password_hash)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    const updated = await setPassword(req.user.id, next);
    res.json({ token: sign(updated), user: publicUser(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao trocar a senha' });
  }
});

async function setPassword(userId, password) {
  const hash = await bcrypt.hash(password, 12);
  // Arredonda para o segundo anterior: o JWT novo (iat em segundos) precisa
  // continuar valido, e os emitidos antes da troca deixam de valer.
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $1, password_changed_at = date_trunc('second', NOW())
      WHERE id = $2 RETURNING id, email, name`,
    [hash, userId]
  );
  return rows[0];
}

// Sempre responde igual, exista ou nao a conta, para nao revelar quem tem acesso.
router.post('/forgot', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const reply = { message: 'Se o e-mail tiver acesso, um link de redefinição foi enviado.' };
  if (email !== OWNER_EMAIL) return res.json(reply);
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE LOWER(email) = $1', [email]);
    if (!rows[0]) return res.json(reply);
    const token = await resets.create(rows[0].id);
    if (!token) return res.json(reply);
    await sendMail({ to: rows[0].email, subject: 'Redefinir senha do hub', html: resetEmail(`${HUB_URL}/redefinir-senha?token=${token}`) });
    res.json(reply);
  } catch (err) {
    console.error('[auth] forgot:', err.message);
    res.status(500).json({ error: 'Não foi possível enviar o e-mail agora' });
  }
});

router.get('/reset/:token', async (req, res) => {
  const r = await resets.find(req.params.token).catch(() => null);
  if (!r) return res.status(400).json({ error: 'Link inválido ou expirado' });
  res.json({ email: r.email });
});

router.post('/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!validPassword(password)) return res.status(400).json({ error: 'A senha precisa ter ao menos 10 caracteres' });
  try {
    const r = await resets.find(token);
    if (!r) return res.status(400).json({ error: 'Link inválido ou expirado' });
    await resets.consume(r.id, r.user_id);
    const user = await setPassword(r.user_id, password);
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error('[auth] reset:', err.message);
    res.status(500).json({ error: 'Falha ao redefinir a senha' });
  }
});

module.exports = router;

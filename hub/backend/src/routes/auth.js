const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciais inválidas' });
    const payload = { id: user.id, email: user.email, name: user.name, role: user.role || 'admin' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role || 'admin' } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

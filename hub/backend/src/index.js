require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/finance',   require('./routes/finance'));
app.use('/api/monitor',   require('./routes/monitor'));
app.use('/api/tickets',   require('./routes/tickets'));
app.use('/api/users',     require('./routes/users'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`Hub API rodando na porta ${PORT}`));

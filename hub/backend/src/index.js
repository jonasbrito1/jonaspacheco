require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Serve uploaded files from hub/backend/uploads, which is where the app stores them.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/finance',   require('./routes/finance'));
app.use('/api/monitor',   require('./routes/monitor'));
app.use('/api/tickets',   require('./routes/tickets'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/portal',    require('./routes/portal'));
app.use('/api/tf',        require('./routes/taskflow'));
app.use('/api/admin/blog', require('./modules/blog/admin'));
app.use('/api/blog',       require('./modules/blog/public'));
app.use('/api/analytics',       require('./modules/analytics/public'));
app.use('/api/admin/analytics', require('./modules/analytics/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`Hub API rodando na porta ${PORT}`));

// Acessos da landing: cria as tabelas se faltarem e aplica a retencao uma vez por dia.
const analytics = require('./modules/analytics/helpers');
analytics.ensureSchema()
  .then(() => analytics.purgeOld())
  .catch((err) => console.error('[analytics] falha ao preparar o schema:', err.message));
setInterval(() => analytics.purgeOld().catch(() => {}), 24 * 60 * 60 * 1000).unref();

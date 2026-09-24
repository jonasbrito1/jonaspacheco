require('dotenv').config();
const express = require('express');
const { ensureSchema } = require('./db/schema');

const app = express();

// Atras do Nginx e da Cloudflare; o IP real vem de CF-Connecting-IP.
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');

// Coleta publica de acessos da landing: le o corpo como texto (sendBeacon),
// por isso e registrada antes do parser JSON.
app.use('/api/analytics', require('./modules/analytics/public'));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/overview',        require('./routes/overview'));
app.use('/api/admin/analytics', require('./modules/analytics/admin'));
app.use('/api/sites',           require('./routes/sites'));
app.use('/api/vps',             require('./routes/vps'));
app.use('/api/projects',        require('./routes/projects'));
app.use('/api/notes',           require('./routes/notes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'hub-jonaspacheco' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

const PORT = process.env.PORT || 3201;

ensureSchema()
  .then(() => {
    app.listen(PORT, '127.0.0.1', () => console.log(`Hub Jonas Pacheco rodando na porta ${PORT}`));
    require('./services/sampler').start();
  })
  .catch((err) => {
    console.error('[hub] falha ao preparar o banco:', err.message);
    process.exit(1);
  });

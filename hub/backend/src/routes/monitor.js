const router = require('express').Router();
const auth = require('../middleware/auth');
const https = require('https');
const http = require('http');

router.use(auth);

const services = [
  { name: 'Portfolio', url: 'https://jonaspacheco.cloud' },
  { name: 'i9script', url: 'https://i9script.com' },
  { name: 'LicitasisPro', url: 'https://licitasispro.i9script.com' },
  { name: 'VisualApp', url: 'https://visualapp.i9script.com' },
  { name: 'Horizonte do Saber', url: 'https://horizontedosaber.com.br' },
  { name: 'GBC Cidade Nova', url: 'https://gbcidadenovaam.com.br' },
];

function checkUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      resolve({ status: res.statusCode < 400 ? 'online' : 'degraded', statusCode: res.statusCode, latency: Date.now() - start });
    });
    req.on('error', () => resolve({ status: 'offline', statusCode: null, latency: null }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', statusCode: null, latency: null }); });
  });
}

router.get('/', async (req, res) => {
  const results = await Promise.all(
    services.map(async (s) => ({ ...s, ...(await checkUrl(s.url)) }))
  );
  res.json(results);
});

module.exports = router;

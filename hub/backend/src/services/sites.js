/**
 * Checagem de disponibilidade dos sites cadastrados: status HTTP, latencia e
 * dias ate o certificado TLS expirar (o que o visitante ve; atras da
 * Cloudflare e o certificado da borda).
 */
const https = require('https');
const http = require('http');
const pool = require('../db/pool');

const TIMEOUT_MS = 10000;

function check(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;
    let certDays = null;
    const req = client.get(url, { timeout: TIMEOUT_MS, headers: { 'User-Agent': 'hub-jonaspacheco-monitor/1.0' } }, (res) => {
      const cert = res.socket.getPeerCertificate?.();
      if (cert?.valid_to) certDays = Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000);
      res.resume();
      const code = res.statusCode;
      resolve({ ok: code < 400, statusCode: code, latencyMs: Date.now() - start, certDays, error: code < 400 ? null : `HTTP ${code}` });
    });
    req.on('timeout', () => req.destroy(new Error('Tempo esgotado')));
    req.on('error', (err) => resolve({ ok: false, statusCode: null, latencyMs: null, certDays, error: err.message.slice(0, 200) }));
  });
}

async function checkAll() {
  const { rows } = await pool.query('SELECT id, url FROM sites WHERE active ORDER BY id');
  await Promise.all(rows.map(async (s) => {
    const r = await check(s.url);
    await pool.query(
      `INSERT INTO site_checks (site_id, ok, status_code, latency_ms, cert_days, error) VALUES ($1,$2,$3,$4,$5,$6)`,
      [s.id, r.ok, r.statusCode, r.latencyMs, r.certDays, r.error]
    );
  }));
}

module.exports = { check, checkAll };

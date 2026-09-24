const router = require('express').Router();
const express = require('express');
const crypto = require('crypto');
const pool = require('../../db/pool');
const h = require('./helpers');

// O navegador envia via sendBeacon com text/plain, que nao dispara preflight
// de CORS. Por isso o corpo chega como texto e e convertido aqui.
router.use(express.text({ type: '*/*', limit: '4kb' }));

// Limite simples por IP: 60 eventos por minuto.
const hits = new Map();
setInterval(() => hits.clear(), 60 * 1000).unref();

const TYPES = new Set(['pageview', 'click', 'leave']);

router.post('/collect', async (req, res) => {
  res.status(204).end();

  try {
    const ua = req.headers['user-agent'] || '';
    if (!ua || h.BOT_RE.test(ua)) return;

    const origin = h.hostOf(req.headers.origin || req.headers.referer || '');
    if (!origin || !h.ALLOWED_HOSTS.includes(origin)) return;

    const ip = h.clientIp(req);
    const n = (hits.get(ip) || 0) + 1;
    hits.set(ip, n);
    if (n > 60) return;

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return; }
    if (!body || !TYPES.has(body.t)) return;

    const referrerHost = h.hostOf(body.r || '');
    const { browser, os, device } = h.parseUa(ua);
    const salt = await h.dailySalt();
    const visitorId = crypto.createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 16);

    await pool.query(
      `INSERT INTO analytics_events
         (type, visitor_id, path, target, referrer, utm_source, country, region, city,
          ip_anon, browser, os, device, lang, screen_w, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        body.t,
        visitorId,
        h.cut(body.p, 300) || '/',
        h.cut(body.x, 300),
        referrerHost && !h.ALLOWED_HOSTS.includes(referrerHost) ? h.cut(referrerHost, 255) : null,
        h.cut(body.u, 100),
        h.cut(req.headers['cf-ipcountry'], 2),
        h.cut(h.headerText(req.headers['cf-region']), 100),
        h.cut(h.headerText(req.headers['cf-ipcity']), 100),
        h.anonymizeIp(ip),
        browser, os, device,
        h.cut(body.l, 12),
        Number.isFinite(body.w) ? Math.min(Math.max(Math.round(body.w), 0), 10000) : null,
        Number.isFinite(body.d) ? Math.min(Math.max(Math.round(body.d), 0), 24 * 3600 * 1000) : null,
      ]
    );
  } catch (err) {
    console.error('[analytics] falha ao registrar evento:', err.message);
  }
});

module.exports = router;

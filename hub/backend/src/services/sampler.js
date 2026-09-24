/**
 * Tarefas periodicas: amostra da VPS a cada minuto, checagem dos sites a
 * cada 2 minutos e limpeza diaria (30 dias de historico de VPS e sites;
 * a retencao dos acessos fica no modulo analytics).
 */
const pool = require('../db/pool');
const vps = require('./vps');
const sites = require('./sites');
const analytics = require('../modules/analytics/helpers');

const MIN = 60 * 1000;

async function sampleVps() {
  try {
    const s = await vps.snapshot();
    if (!s) return;
    await pool.query(
      `INSERT INTO vps_samples (cpu, mem_used, mem_total, disk_used, disk_total, net_rx, net_tx, load1)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [s.cpu.usage, s.memory.used, s.memory.total, s.disk.used, s.disk.total,
        Math.round(s.network.rxPerSec), Math.round(s.network.txPerSec), s.cpu.load1]
    );
  } catch (err) {
    console.error('[sampler] vps:', err.message);
  }
}

async function checkSites() {
  try { await sites.checkAll(); } catch (err) { console.error('[sampler] sites:', err.message); }
}

async function purge() {
  try {
    await pool.query(`DELETE FROM vps_samples WHERE at < NOW() - interval '30 days'`);
    await pool.query(`DELETE FROM site_checks WHERE checked_at < NOW() - interval '30 days'`);
    await pool.query(`DELETE FROM password_resets WHERE created_at < NOW() - interval '7 days'`);
    await analytics.purgeOld();
  } catch (err) {
    console.error('[sampler] limpeza:', err.message);
  }
}

function start() {
  if (vps.IS_LINUX) {
    // A primeira leitura de CPU/rede e so aquecimento; grava a partir da segunda.
    setTimeout(sampleVps, 5000);
    setInterval(sampleVps, MIN).unref();
  }
  checkSites();
  setInterval(checkSites, 2 * MIN).unref();
  purge();
  setInterval(purge, 24 * 60 * MIN).unref();
}

module.exports = { start };

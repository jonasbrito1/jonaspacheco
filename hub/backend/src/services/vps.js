/**
 * Recursos da VPS lidos direto do /proc e do os, sem agente externo: o hub
 * roda na propria maquina que monitora. CPU e rede sao taxas, entao precisam
 * de duas leituras; a primeira e feita na subida para aquecer.
 */
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const run = promisify(execFile);
const IS_LINUX = process.platform === 'linux';

let prevCpu = null;
let prevNet = null;

function readCpu() {
  const n = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number);
  return { idle: n[3] + n[4], total: n.reduce((a, b) => a + b, 0) };
}

function cpuUsage() {
  const cur = readCpu();
  const prev = prevCpu || cur;
  prevCpu = cur;
  const dTotal = cur.total - prev.total;
  if (dTotal <= 0) return 0;
  return Math.round(((dTotal - (cur.idle - prev.idle)) / dTotal) * 1000) / 10;
}

function memory() {
  // MemAvailable inclui o cache descartavel; os.freemem() ignora e assusta a toa.
  const info = fs.readFileSync('/proc/meminfo', 'utf8');
  const kb = (k) => Number((info.match(new RegExp(`^${k}:\\s+(\\d+)`, 'm')) || [])[1] || 0) * 1024;
  const total = kb('MemTotal');
  const swapTotal = kb('SwapTotal');
  return { total, used: total - kb('MemAvailable'), swapTotal, swapUsed: swapTotal - kb('SwapFree') };
}

async function disk() {
  const { stdout } = await run('df', ['-B1', '--output=size,used,avail', '/']);
  const [total, used, free] = stdout.trim().split('\n')[1].trim().split(/\s+/).map(Number);
  return { total, used, free };
}

function network() {
  let rx = 0;
  let tx = 0;
  for (const line of fs.readFileSync('/proc/net/dev', 'utf8').split('\n').slice(2)) {
    const [name, data] = line.split(':');
    if (!data || /^(lo|docker|veth|br-)/.test(name.trim())) continue;
    const c = data.trim().split(/\s+/).map(Number);
    rx += c[0];
    tx += c[8];
  }
  const now = Date.now();
  const prev = prevNet || { rx, tx, now: now - 1000 };
  prevNet = { rx, tx, now };
  const dt = (now - prev.now) / 1000 || 1;
  return { rxPerSec: Math.max(0, (rx - prev.rx) / dt), txPerSec: Math.max(0, (tx - prev.tx) / dt), rxTotal: rx, txTotal: tx };
}

async function snapshot() {
  if (!IS_LINUX) return null;
  const load = os.loadavg();
  return {
    at: new Date().toISOString(),
    host: os.hostname(),
    uptime: os.uptime(),
    cpu: { usage: cpuUsage(), cores: os.cpus().length, load1: load[0], load5: load[1], load15: load[2] },
    memory: memory(),
    disk: await disk(),
    network: network(),
  };
}

// Processos do pm2 (o hub roda como root, que e o dono do daemon).
async function processes() {
  if (!IS_LINUX) return [];
  try {
    const { stdout } = await run('pm2', ['jlist'], { timeout: 10000, maxBuffer: 20 * 1024 * 1024 });
    return JSON.parse(stdout.slice(stdout.indexOf('['))).map((p) => ({
      name: p.name,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu ?? 0,
      memory: p.monit?.memory ?? 0,
      restarts: p.pm2_env?.restart_time ?? 0,
      uptimeSince: p.pm2_env?.pm_uptime || null,
    })).sort((a, b) => b.memory - a.memory);
  } catch (err) {
    console.error('[vps] pm2 jlist:', err.message);
    return [];
  }
}

if (IS_LINUX) {
  prevCpu = readCpu();
  network();
}

module.exports = { snapshot, processes, IS_LINUX };

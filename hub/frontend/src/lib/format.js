const nf = new Intl.NumberFormat('pt-BR')

export const num = (v) => (v == null ? '—' : nf.format(v))

export function bytes(v, digits = 1) {
  if (v == null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = Number(v)
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i ? digits : 0).replace('.', ',')} ${units[i]}`
}

export const rate = (v) => `${bytes(v)}/s`

export const pct = (v, digits = 1) => (v == null ? '—' : `${Number(v).toFixed(digits).replace('.', ',')}%`)

export function duration(ms) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}min ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}min`
}

export function uptime(seconds) {
  if (seconds == null) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return d ? `${d}d ${h}h` : `${h}h ${Math.floor((seconds % 3600) / 60)}min`
}

export function dateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function ago(iso) {
  if (!iso) return '—'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  return `há ${Math.floor(s / 86400)} d`
}

export function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const regionNames = (() => { try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }) } catch { return null } })()

export function flag(code) {
  if (!code || code.length !== 2 || code === 'XX' || code === 'T1') return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
}

export function country(code) {
  if (!code) return '—'
  let name = code
  try { name = regionNames?.of(code) || code } catch { /* codigo desconhecido */ }
  return `${flag(code)} ${name}`.trim()
}

export const DEVICE = { desktop: 'Computador', mobile: 'Celular', tablet: 'Tablet' }

export const CHART = {
  grid: '#1a3a5c',
  tick: { fill: '#4f7394', fontSize: 11 },
  tooltip: { background: '#0b1c33', border: '1px solid #24507a', borderRadius: 8, color: '#EEF2FF', fontSize: 12 },
  blue: '#1E6FD9',
  sky: '#4c93f0',
  amber: '#f59e0b',
  green: '#22c55e',
}

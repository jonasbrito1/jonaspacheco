import React, { useCallback, useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { RefreshCw, Download, Eye, Users, MousePointerClick, Timer, Radio, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'

const PERIODS = [
  { days: 1, label: '24h' },
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

const regionName = (() => {
  try { return new Intl.DisplayNames(['pt-BR'], { type: 'region' }) } catch { return null }
})()

function flag(code) {
  if (!code || code.length !== 2 || code === 'XX' || code === 'T1') return ''
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)))
}

function countryLabel(code) {
  if (!code) return '—'
  let name = code
  try { name = regionName?.of(code) || code } catch { /* codigo desconhecido */ }
  return `${flag(code)} ${name}`.trim()
}

function duration(ms) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`
}

function when(iso) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function shortTarget(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

const DEVICE = { desktop: 'Computador', mobile: 'Celular', tablet: 'Tablet' }

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [visits, setVisits] = useState({ data: [], total: 0, page: 1, limit: 25 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, v] = await Promise.all([
        api.get('/admin/analytics/summary', { params: { days } }),
        api.get('/admin/analytics/visits', { params: { days, page, limit: 25 } }),
      ])
      setData(s.data)
      setVisits(v.data)
    } catch (err) {
      setError(err.response?.status === 403 ? 'Acesso restrito ao dono do painel.' : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [days, page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const exportCsv = async () => {
    const res = await api.get('/admin/analytics/export.csv', { params: { days }, responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `acessos-${days}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const k = data?.kpis
  const pages = Math.max(1, Math.ceil((visits.total || 0) / (visits.limit || 25)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#EEF2FF' }}>Acessos · jonaspacheco.cloud</h2>
          <p style={{ color: '#4A6B87', fontSize: 13, marginTop: 4 }}>
            Medição sem cookies. IP anonimizado e identificador de visitante renovado a cada dia.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={st.segmented}>
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => { setDays(p.days); setPage(1) }}
                style={{ ...st.segBtn, ...(days === p.days ? st.segActive : {}) }}>{p.label}</button>
            ))}
          </div>
          <button onClick={load} disabled={loading} style={st.btn}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Atualizar
          </button>
          <button onClick={exportCsv} style={st.btn}><Download size={15} /> CSV</button>
        </div>
      </div>

      {error && <div style={{ ...st.card, color: '#EF4444' }}>{error}</div>}

      {k && (
        <div className="analytics-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <Kpi icon={Eye} label="Visualizações" value={k.pageviews} hint={`Hoje: ${k.today.pageviews}`} />
          <Kpi icon={Users} label="Visitantes únicos" value={k.visitors} hint={`Hoje: ${k.today.visitors}`} />
          <Kpi icon={MousePointerClick} label="Cliques em projetos" value={k.clicks} />
          <Kpi icon={Timer} label="Tempo médio" value={duration(k.avg_duration_ms)} />
          <Kpi icon={Radio} label="Agora (5 min)" value={k.realtime} color={k.realtime ? '#009C3B' : '#EEF2FF'} />
        </div>
      )}

      {data && (
        <div style={st.card}>
          <h3 style={st.h3}>Visualizações e visitantes</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E6FD9" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#1E6FD9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gVi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFDF00" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#FFDF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a3a5c" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: '#4A6B87', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fill: '#4A6B87', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#112640', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF' }} />
              <Area type="monotone" dataKey="pageviews" name="Visualizações" stroke="#1E6FD9" strokeWidth={2} fill="url(#gPv)" />
              <Area type="monotone" dataKey="visitors" name="Visitantes" stroke="#FFDF00" strokeWidth={2} fill="url(#gVi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          <TopList title="Origem do tráfego" rows={data.referrers} empty="Acesso direto ou sem origem informada" />
          <TopList title="Projetos clicados" rows={data.clicks} format={shortTarget} metric="events" metricLabel="cliques" />
          <TopList title="Países" rows={data.countries} format={countryLabel} />
          <TopList title="Cidades" rows={data.cities} empty="Ative os cabeçalhos de localização na Cloudflare" />
          <TopList title="Dispositivos" rows={data.devices} format={d => DEVICE[d] || d} />
          <TopList title="Navegadores" rows={data.browsers} />
          <TopList title="Sistemas" rows={data.oses} />
          <TopList title="Idiomas" rows={data.langs} />
          <TopList title="Campanhas (utm_source)" rows={data.utm} empty="Nenhum link com utm_source" />
        </div>
      )}

      <div style={st.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ ...st.h3, marginBottom: 0 }}>Visitantes recentes</h3>
          <span style={{ color: '#4A6B87', fontSize: 12 }}>{visits.total} no período</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
            <thead>
              <tr>
                {['Última atividade', 'Local', 'Rede (IP anonimizado)', 'Dispositivo', 'Origem', 'Páginas', 'Cliques', 'Tempo'].map(h => (
                  <th key={h} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visits.data.map(v => (
                <tr key={v.visitor_id} style={{ borderTop: '1px solid #1a3a5c' }}>
                  <td style={st.td}>{when(v.last_seen)}</td>
                  <td style={st.td}>
                    {v.city ? `${v.city}${v.region ? `, ${v.region}` : ''} · ` : ''}{countryLabel(v.country)}
                  </td>
                  <td style={{ ...st.td, fontFamily: 'ui-monospace, monospace', color: '#8BAFC8' }}>{v.ip_anon || '—'}</td>
                  <td style={st.td}>{DEVICE[v.device] || v.device} · {v.browser} · {v.os}{v.lang ? ` · ${v.lang}` : ''}</td>
                  <td style={st.td}>{v.utm_source ? `utm: ${v.utm_source}` : v.referrer || 'Direto'}</td>
                  <td style={st.td}>{v.pageviews}</td>
                  <td style={st.td} title={(v.targets || []).join('\n')}>
                    {v.clicks ? `${v.clicks} · ${(v.targets || []).map(shortTarget).join(', ')}` : '0'}
                  </td>
                  <td style={st.td}>{duration(v.duration_ms)}</td>
                </tr>
              ))}
              {!visits.data.length && (
                <tr><td colSpan={8} style={{ ...st.td, color: '#4A6B87', textAlign: 'center', padding: 24 }}>Nenhum acesso no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <button style={st.btn} disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={15} /></button>
            <span style={{ color: '#8BAFC8', fontSize: 13 }}>{page} / {pages}</span>
            <button style={st.btn} disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1100px) { .analytics-kpis { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px)  { .analytics-kpis { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, hint, color = '#EEF2FF' }) {
  return (
    <div style={st.stat}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4A6B87', fontSize: 13 }}><Icon size={15} /> {label}</div>
      <p style={{ color, fontSize: 28, fontWeight: 700, marginTop: 6 }}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      {hint && <p style={{ color: '#4A6B87', fontSize: 12, marginTop: 2 }}>{hint}</p>}
    </div>
  )
}

function TopList({ title, rows, format = x => x, metric = 'visitors', metricLabel = 'visitantes', empty = 'Sem dados no período' }) {
  const max = Math.max(1, ...rows.map(r => r[metric]))
  return (
    <div style={st.card}>
      <h3 style={st.h3}>{title}</h3>
      {!rows.length && <p style={{ color: '#4A6B87', fontSize: 13 }}>{empty}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(r => (
          <div key={r.label} style={{ position: 'relative', padding: '6px 10px', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${(r[metric] / max) * 100}%`, background: '#1E6FD922' }} />
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span style={{ color: '#EEF2FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{format(r.label)}</span>
              <span style={{ color: '#8BAFC8', flexShrink: 0 }} title={metricLabel}>{r[metric].toLocaleString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const st = {
  card: { background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: 20 },
  stat: { background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: '18px 20px' },
  h3: { fontSize: 14, fontWeight: 600, color: '#EEF2FF', marginBottom: 12 },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0d1e35', border: '1px solid #254d6e', borderRadius: 8, color: '#EEF2FF', fontSize: 13 },
  segmented: { display: 'flex', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 8, padding: 3 },
  segBtn: { padding: '5px 12px', background: 'none', border: 'none', borderRadius: 6, color: '#8BAFC8', fontSize: 13 },
  segActive: { background: '#112640', color: '#FFDF00', fontWeight: 600 },
  th: { textAlign: 'left', color: '#4A6B87', fontWeight: 500, padding: '8px 10px', whiteSpace: 'nowrap' },
  td: { color: '#EEF2FF', padding: '10px', verticalAlign: 'top' },
}

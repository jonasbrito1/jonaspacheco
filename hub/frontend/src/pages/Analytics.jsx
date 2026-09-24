import React, { useCallback, useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { RefreshCw, Download, Eye, Users, MousePointerClick, Timer, Radio, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import api from '../lib/api'
import { CHART, DEVICE, country, dateTime, duration, host, num } from '../lib/format'
import { PageHead, Kpi, Segmented, Rank } from '../components/ui'

const PERIODS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
]

export default function Analytics() {
  const [days, setDays] = useState(30)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [visits, setVisits] = useState({ data: [], total: 0, limit: 25 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, v] = await Promise.all([
        api.get('/admin/analytics/summary', { params: { days } }),
        api.get('/admin/analytics/visits', { params: { days, page, limit: 25 } }),
      ])
      setData(s.data)
      setVisits(v.data)
      setError('')
    } catch {
      setError('Não foi possível carregar os acessos.')
    } finally {
      setLoading(false)
    }
  }, [days, page])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 60000)
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
    <div className="page">
      <PageHead title="Acessos da landing" subtitle="jonaspacheco.cloud · medição própria, sem cookies">
        <Segmented options={PERIODS} value={days} onChange={(d) => { setDays(d); setPage(1) }} />
        <button className="btn" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Atualizar</button>
        <button className="btn" onClick={exportCsv}><Download size={15} />CSV</button>
      </PageHead>

      {error && <div className="error-box">{error}</div>}

      {k && (
        <div className="grid grid-kpi">
          <Kpi icon={Eye} label="Visualizações" value={num(k.pageviews)} hint={`hoje: ${num(k.today.pageviews)}`} />
          <Kpi icon={Users} label="Visitantes únicos" value={num(k.visitors)} hint={`hoje: ${num(k.today.visitors)}`} />
          <Kpi icon={MousePointerClick} label="Cliques em links" value={num(k.clicks)} hint="projetos, GitHub, LinkedIn" />
          <Kpi icon={Timer} label="Tempo médio" value={duration(k.avg_duration_ms)} />
          <Kpi icon={Radio} label="Agora" value={num(k.realtime)} tone={k.realtime ? 'ok' : undefined} hint="últimos 5 minutos" />
        </div>
      )}

      {data && (
        <div className="card">
          <h2>Visualizações e visitantes</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.series} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gVi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.amber} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={CHART.tick} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
              <Area type="monotone" dataKey="pageviews" name="Visualizações" stroke={CHART.blue} strokeWidth={2} fill="url(#gPv)" />
              <Area type="monotone" dataKey="visitors" name="Visitantes" stroke={CHART.amber} strokeWidth={2} fill="url(#gVi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && (
        <div className="grid grid-auto">
          <div className="card"><h2>Origem do tráfego</h2><Rank rows={data.referrers} empty="Acessos diretos ou sem origem informada" /></div>
          <div className="card"><h2>Links clicados</h2><Rank rows={data.clicks} metric="events" format={host} /></div>
          <div className="card"><h2>Países</h2><Rank rows={data.countries} format={country} /></div>
          <div className="card"><h2>Cidades</h2><Rank rows={data.cities} empty="Ative os cabeçalhos de localização na Cloudflare" /></div>
          <div className="card"><h2>Dispositivos</h2><Rank rows={data.devices} format={(d) => DEVICE[d] || d} /></div>
          <div className="card"><h2>Navegadores</h2><Rank rows={data.browsers} /></div>
          <div className="card"><h2>Sistemas</h2><Rank rows={data.oses} /></div>
          <div className="card"><h2>Idiomas</h2><Rank rows={data.langs} /></div>
          <div className="card"><h2>Campanhas (utm_source)</h2><Rank rows={data.utm} empty="Nenhum link com utm_source" /></div>
        </div>
      )}

      <div className="card">
        <h2>Visitantes <span className="dim" style={{ textTransform: 'none', fontWeight: 400 }}>{num(visits.total)} no período</span></h2>
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 860 }}>
            <thead>
              <tr>{['Última atividade', 'Local', 'Rede (IP anonimizado)', 'Dispositivo', 'Origem', 'Páginas', 'Cliques', 'Tempo'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visits.data.map((v) => (
                <tr key={v.visitor_id}>
                  <td>{dateTime(v.last_seen)}</td>
                  <td>{v.city ? `${v.city}${v.region ? `, ${v.region}` : ''} · ` : ''}{country(v.country)}</td>
                  <td className="mono muted">{v.ip_anon || '—'}</td>
                  <td>{DEVICE[v.device] || v.device} · {v.browser} · {v.os}{v.lang ? ` · ${v.lang}` : ''}</td>
                  <td>{v.utm_source ? `utm: ${v.utm_source}` : v.referrer || <span className="dim">Direto</span>}</td>
                  <td>{v.pageviews}</td>
                  <td title={(v.targets || []).join('\n')}>{v.clicks ? `${v.clicks} · ${(v.targets || []).map(host).join(', ')}` : '0'}</td>
                  <td>{duration(v.duration_ms)}</td>
                </tr>
              ))}
              {!visits.data.length && <tr><td colSpan={8} className="empty">Nenhum acesso no período.</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><ChevronLeft size={15} /></button>
            <span className="muted">{page} / {pages}</span>
            <button className="btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima"><ChevronRight size={15} /></button>
          </div>
        )}
      </div>

      <p className="dim" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}>
        <ShieldCheck size={15} style={{ flex: 'none', marginTop: 2 }} />
        IP gravado sem o último bloco; o identificador de visitante usa uma chave que muda todo dia e é apagada, então
        não é possível reconhecer a mesma pessoa em dias diferentes. Quem ativa “não rastrear” não é medido. Retenção de 180 dias.
      </p>
    </div>
  )
}

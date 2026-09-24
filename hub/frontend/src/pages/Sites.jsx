import React, { useCallback, useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Plus, RefreshCw, Pencil, Trash2, ExternalLink, Lock } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { CHART, ago, host, pct } from '../lib/format'
import { PageHead, Kpi, Modal, Field, StatusBadge, Segmented, Loading } from '../components/ui'

const WINDOWS = [
  { value: 24, label: '24h' },
  { value: 168, label: '7 dias' },
  { value: 720, label: '30 dias' },
]

function certTone(days) {
  if (days == null) return ''
  return days < 7 ? 'bad' : days < 21 ? 'warn' : 'ok'
}

export default function Sites() {
  const [sites, setSites] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sites')
      setSites(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [load])

  if (!sites) return <Loading />

  const active = sites.filter((s) => s.active)
  const up = active.filter((s) => s.ok).length
  const withUptime = active.filter((s) => s.uptime_24h != null)
  const avgUptime = withUptime.length ? withUptime.reduce((t, s) => t + s.uptime_24h, 0) / withUptime.length : null
  const certs = active.filter((s) => s.cert_days != null)
  const nextCert = certs.length ? certs.reduce((m, s) => (s.cert_days < m.cert_days ? s : m)) : null

  return (
    <div className="page">
      <PageHead title="Sites" subtitle="Checagem a cada 2 minutos: resposta HTTP, tempo de resposta e validade do certificado.">
        <button className="btn" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Atualizar</button>
        <button className="btn btn-primary" onClick={() => setEditing({ name: '', url: 'https://', active: true })}><Plus size={15} />Adicionar site</button>
      </PageHead>

      <div className="grid grid-kpi">
        <Kpi label="No ar" value={`${up}/${active.length}`} tone={up < active.length ? 'bad' : 'ok'} />
        <Kpi label="Disponibilidade média 24h" value={pct(avgUptime, 2)} />
        <Kpi label="Certificado mais próximo do vencimento" value={nextCert ? `${nextCert.cert_days} dias` : '—'}
          tone={nextCert ? certTone(nextCert.cert_days) : undefined} hint={nextCert?.name} />
      </div>

      {selected && <History site={selected} onClose={() => setSelected(null)} />}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ margin: 0 }}>
          <table className="table" style={{ minWidth: 820 }}>
            <thead>
              <tr>{['Site', 'Status', 'Resposta', '24h', '7 dias', 'Certificado', 'Última checagem', ''].map((h) => <th key={h} style={{ paddingTop: 14 }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5, cursor: 'pointer' }} onClick={() => setSelected(s)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="dim" style={{ fontSize: 12 }}>
                      {host(s.url)} <ExternalLink size={11} />
                    </a>
                  </td>
                  <td>
                    <StatusBadge ok={s.active ? s.ok : null}>{!s.active ? 'Pausado' : undefined}</StatusBadge>
                    {s.down_since && <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>fora desde {ago(s.down_since)}</div>}
                    {!s.ok && s.error && <div className="mono" style={{ fontSize: 11.5, color: 'var(--bad)', marginTop: 2 }}>{s.error}</div>}
                  </td>
                  <td>{s.latency_ms != null ? `${s.latency_ms} ms` : '—'}<div className="dim" style={{ fontSize: 12 }}>{s.status_code ? `HTTP ${s.status_code}` : ''}</div></td>
                  <td>{pct(s.uptime_24h, 2)}</td>
                  <td>{pct(s.uptime_7d, 2)}</td>
                  <td>{s.cert_days != null ? <span className={`badge ${certTone(s.cert_days)}`}><Lock size={11} />{s.cert_days} dias</span> : '—'}</td>
                  <td className="dim">{ago(s.checked_at)}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost" onClick={() => setEditing(s)} aria-label="Editar"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <SiteForm site={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function History({ site, onClose }) {
  const [hours, setHours] = useState(24)
  const [rows, setRows] = useState([])

  useEffect(() => {
    api.get(`/sites/${site.id}/history`, { params: { hours } }).then(({ data }) => setRows(data.map((r) => ({
      ...r,
      label: new Date(r.t).toLocaleString('pt-BR', hours <= 24 ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit' }),
    }))))
  }, [site.id, hours])

  return (
    <div className="card">
      <h2>
        {site.name} · tempo de resposta e disponibilidade
        <span className="actions">
          <Segmented options={WINDOWS} value={hours} onChange={setHours} />
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </span>
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis yAxisId="ms" tick={CHART.tick} tickLine={false} axisLine={false} unit=" ms" width={62} />
          <YAxis yAxisId="up" orientation="right" domain={[0, 100]} tick={CHART.tick} tickLine={false} axisLine={false} unit="%" width={44} />
          <Tooltip contentStyle={CHART.tooltip} />
          <Line yAxisId="ms" type="monotone" dataKey="latency" name="Resposta (ms)" stroke={CHART.sky} dot={false} strokeWidth={2} />
          <Line yAxisId="up" type="stepAfter" dataKey="uptime" name="Disponível (%)" stroke={CHART.green} dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SiteForm({ site, onClose, onSaved }) {
  const [form, setForm] = useState({ name: site.name, url: site.url, active: site.active !== false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      if (site.id) await api.put(`/sites/${site.id}`, form)
      else await api.post('/sites', form)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Remover ${site.name} e todo o histórico de checagens?`)) return
    await api.delete(`/sites/${site.id}`)
    onSaved()
  }

  return (
    <Modal title={site.id ? 'Editar site' : 'Adicionar site'} onClose={onClose} footer={
      <>
        {site.id && <button className="btn btn-danger" onClick={remove} style={{ marginRight: 'auto' }}><Trash2 size={15} />Remover</button>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</button>
      </>
    }>
      {error && <div className="error-box">{error}</div>}
      <Field label="Nome"><input className="input" value={form.name} onChange={set('name')} autoFocus /></Field>
      <Field label="URL"><input className="input" value={form.url} onChange={set('url')} placeholder="https://exemplo.com.br" /></Field>
      {site.id && (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--muted)' }}>
          <input type="checkbox" checked={form.active} onChange={set('active')} /> Monitorar este site
        </label>
      )}
    </Modal>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Eye, Users, Radio, Globe, Cpu, MemoryStick, HardDrive, FolderKanban, NotebookPen, ShieldCheck } from 'lucide-react'
import api, { currentUser } from '../lib/api'
import { CHART, bytes, num, pct, ago, uptime } from '../lib/format'
import { PageHead, Kpi, Meter, Loading } from '../components/ui'

const STATUS = { em_desenvolvimento: 'Em desenvolvimento', ativo: 'Ativo', manutencao: 'Manutenção', pausado: 'Pausado', concluido: 'Concluído' }

function greeting() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Manaus' }))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export default function Overview() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => api.get('/overview').then(({ data }) => setData(data)).catch(() => setError('Não foi possível carregar o resumo.'))
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const name = (currentUser().name || 'Jonas').split(' ')[0]

  if (error) return <div className="page"><div className="error-box">{error}</div></div>
  if (!data) return <Loading />

  const a = data.access
  const s = data.sites
  const v = data.vps
  const memPct = v ? (100 * v.memory.used) / v.memory.total : null
  const diskPct = v ? (100 * v.disk.used) / v.disk.total : null
  const projectsTotal = data.projects.reduce((t, p) => t + p.n, 0)

  return (
    <div className="page">
      <PageHead title={`${greeting()}, ${name}`} subtitle="Resumo da landing, dos sites e da VPS. Atualiza a cada 30 segundos." />

      <div className="grid grid-kpi">
        <Kpi icon={Eye} label="Visualizações hoje" value={num(a.pageviews_today)} hint={`${num(a.pageviews_7d)} em 7 dias`} />
        <Kpi icon={Users} label="Visitantes hoje" value={num(a.visitors_today)} hint={`${num(a.visitors_7d)} em 7 dias`} />
        <Kpi icon={Radio} label="Na landing agora" value={num(a.realtime)} tone={a.realtime ? 'ok' : undefined} hint="últimos 5 minutos" />
        <Kpi icon={Globe} label="Sites no ar" value={`${s.up}/${s.total}`} tone={s.up < s.total ? 'bad' : 'ok'}
          hint={s.min_cert_days != null ? `certificado mais próximo: ${s.min_cert_days} dias` : 'aguardando checagem'} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Visitantes · 14 dias <Link to="/acessos" style={{ textTransform: 'none', fontWeight: 500 }}>Detalhes</Link></h2>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={data.accessSeries} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="ov" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={20} />
              <Tooltip contentStyle={CHART.tooltip} />
              <Area type="monotone" dataKey="visitors" name="Visitantes" stroke={CHART.sky} strokeWidth={2} fill="url(#ov)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Sites <Link to="/sites" style={{ textTransform: 'none', fontWeight: 500 }}>Ver todos</Link></h2>
          {s.down.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.down.map((d) => (
                <div key={d.url} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span><span className="badge bad" style={{ marginRight: 8 }}><span className="dot" />Fora</span>{d.name}</span>
                  <span className="dim mono">{d.error || `HTTP ${d.status_code}`}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ok)', padding: '24px 0' }}>
              <ShieldCheck size={22} /> Todos os {s.total} sites respondendo normalmente.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h2>VPS <Link to="/vps" style={{ textTransform: 'none', fontWeight: 500 }}>Detalhes</Link></h2>
          {v ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Resource icon={Cpu} label="CPU" value={pct(v.cpu.usage)} percent={v.cpu.usage} />
              <Resource icon={MemoryStick} label="Memória" value={`${bytes(v.memory.used)} de ${bytes(v.memory.total)}`} percent={memPct} />
              <Resource icon={HardDrive} label="Disco" value={`${bytes(v.disk.used)} de ${bytes(v.disk.total)}`} percent={diskPct} />
              <div className="dim" style={{ fontSize: 12 }}>{v.host} · ligada há {uptime(v.uptime)}</div>
            </div>
          ) : <div className="empty">Disponível apenas na VPS</div>}
        </div>

        <div className="card">
          <h2>Projetos <Link to="/projetos" style={{ textTransform: 'none', fontWeight: 500 }}>Abrir</Link></h2>
          {projectsTotal ? (
            <div className="rank">
              {data.projects.map((p) => (
                <div className="rank-row" key={p.status}>
                  <div className="bar" style={{ width: `${(p.n / projectsTotal) * 100}%` }} />
                  <span className="label">{STATUS[p.status] || p.status}</span>
                  <span className="value">{p.n}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty"><FolderKanban size={18} /><br />Nenhum projeto cadastrado ainda.</div>
          )}
        </div>

        <div className="card">
          <h2>Anotações recentes <Link to="/anotacoes" style={{ textTransform: 'none', fontWeight: 500 }}>Abrir</Link></h2>
          {data.notes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.notes.map((n) => (
                <Link key={n.id} to={`/anotacoes?id=${n.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.pinned ? '📌 ' : ''}{n.title}</span>
                  <span className="dim" style={{ flex: 'none', fontSize: 12 }}>{ago(n.updated_at)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty"><NotebookPen size={18} /><br />Nenhuma anotação ainda.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function Resource({ icon: Icon, label, value, percent }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon size={14} />{label}</span>
        <span>{value}</span>
      </div>
      <Meter value={percent} />
    </div>
  )
}


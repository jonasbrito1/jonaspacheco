import React, { useEffect, useState } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Cpu, MemoryStick, HardDrive, ArrowDownUp, Clock } from 'lucide-react'
import api from '../lib/api'
import { CHART, bytes, rate, pct, uptime, ago } from '../lib/format'
import { PageHead, Kpi, Meter, Segmented, Loading } from '../components/ui'

const WINDOWS = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

export default function Vps() {
  const [live, setLive] = useState(null)
  const [win, setWin] = useState('24h')
  const [history, setHistory] = useState([])

  useEffect(() => {
    const load = () => api.get('/vps').then(({ data }) => setLive(data)).catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const load = () => api.get('/vps/history', { params: { window: win } }).then(({ data }) => setHistory(data.map((r) => ({
      ...r,
      label: new Date(r.t).toLocaleString('pt-BR', win === '1h' || win === '24h' ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit' }),
    }))))
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [win])

  if (!live) return <Loading />
  if (!live.available || !live.snapshot) {
    return <div className="page"><PageHead title="VPS" /><div className="card empty">A leitura de recursos só funciona com o hub rodando na VPS (Linux).</div></div>
  }

  const s = live.snapshot
  const memPct = (100 * s.memory.used) / s.memory.total
  const diskPct = (100 * s.disk.used) / s.disk.total

  return (
    <div className="page">
      <PageHead title="VPS" subtitle={`${s.host} · ${s.cpu.cores} núcleos · ao vivo, atualiza a cada 5 segundos`} />

      <div className="grid grid-kpi">
        <Kpi icon={Cpu} label="CPU" value={pct(s.cpu.usage)} hint={`carga ${s.cpu.load1.toFixed(2)} · ${s.cpu.load5.toFixed(2)} · ${s.cpu.load15.toFixed(2)}`} />
        <Kpi icon={MemoryStick} label="Memória" value={pct(memPct)} hint={`${bytes(s.memory.used)} de ${bytes(s.memory.total)}`} />
        <Kpi icon={HardDrive} label="Disco" value={pct(diskPct)} hint={`${bytes(s.disk.free)} livres de ${bytes(s.disk.total)}`} />
        <Kpi icon={ArrowDownUp} label="Rede" value={rate(s.network.rxPerSec + s.network.txPerSec)} hint={`↓ ${rate(s.network.rxPerSec)} · ↑ ${rate(s.network.txPerSec)}`} />
        <Kpi icon={Clock} label="Ligada há" value={uptime(s.uptime)} />
      </div>

      <div className="grid grid-3">
        <div className="card"><h2>CPU</h2><Meter value={s.cpu.usage} /></div>
        <div className="card"><h2>Memória</h2><Meter value={memPct} />{s.memory.swapTotal > 0 && <p className="dim" style={{ fontSize: 12, marginTop: 8 }}>swap: {bytes(s.memory.swapUsed)} de {bytes(s.memory.swapTotal)}</p>}</div>
        <div className="card"><h2>Disco</h2><Meter value={diskPct} /></div>
      </div>

      <div className="card">
        <h2>Histórico <Segmented options={WINDOWS} value={win} onChange={setWin} /></h2>
        {history.length ? (
          <div className="grid grid-2">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={history} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={CHART.tick} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={CHART.tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="cpu" name="CPU %" stroke={CHART.sky} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="mem" name="Memória %" stroke={CHART.amber} dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="disk" name="Disco %" stroke={CHART.green} dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={history} margin={{ top: 6, right: 8, left: 6, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={CHART.tick} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={CHART.tick} tickLine={false} axisLine={false} tickFormatter={(v) => bytes(v, 0)} width={64} />
                <Tooltip contentStyle={CHART.tooltip} formatter={(v) => rate(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="rx" name="Entrada" stroke={CHART.sky} fill={CHART.sky} fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="tx" name="Saída" stroke={CHART.amber} fill={CHART.amber} fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="empty">O histórico começa a ser gravado assim que o hub sobe (uma amostra por minuto).</div>}
      </div>

      <div className="card">
        <h2>Processos pm2 <span className="dim" style={{ textTransform: 'none', fontWeight: 400 }}>{live.processes.length} processos</span></h2>
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 600 }}>
            <thead><tr>{['Processo', 'Status', 'CPU', 'Memória', 'Reinícios', 'No ar desde'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {live.processes.map((p) => (
                <tr key={p.name}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className={`badge ${p.status === 'online' ? 'ok' : 'bad'}`}><span className="dot" />{p.status}</span></td>
                  <td>{pct(p.cpu)}</td>
                  <td>{bytes(p.memory)}</td>
                  <td style={{ color: p.restarts > 10 ? 'var(--warn)' : undefined }}>{p.restarts}</td>
                  <td className="dim">{p.status === 'online' ? ago(p.uptimeSince) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'

const icons = { online: CheckCircle, offline: XCircle, degraded: AlertCircle, timeout: Clock }
const colors = { online: '#10b981', offline: '#f87171', degraded: '#f59e0b', timeout: '#94a3b8' }

export default function Monitor() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState(null)

  const check = async () => {
    setLoading(true)
    const { data } = await api.get('/monitor')
    setServices(data)
    setLastCheck(new Date())
    setLoading(false)
  }

  useEffect(() => { check() }, [])

  const online = services.filter(s => s.status === 'online').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Monitor de Sistemas</h2>
          {lastCheck && <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}</p>}
        </div>
        <button onClick={check} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14 }}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Verificando...' : 'Atualizar'}
        </button>
      </div>

      {services.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={s.statCard}>
            <p style={{ color: '#64748b', fontSize: 13 }}>Online</p>
            <p style={{ color: '#10b981', fontSize: 28, fontWeight: 700 }}>{online}</p>
          </div>
          <div style={s.statCard}>
            <p style={{ color: '#64748b', fontSize: 13 }}>Offline</p>
            <p style={{ color: '#f87171', fontSize: 28, fontWeight: 700 }}>{services.filter(s => s.status === 'offline').length}</p>
          </div>
          <div style={s.statCard}>
            <p style={{ color: '#64748b', fontSize: 13 }}>Total</p>
            <p style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700 }}>{services.length}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {services.map(svc => {
          const Icon = icons[svc.status] || AlertCircle
          const color = colors[svc.status] || '#94a3b8'
          return (
            <div key={svc.name} style={{ ...s.card, borderLeft: `3px solid ${color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{svc.name}</h3>
                <Icon size={20} color={color} />
              </div>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{svc.url}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 20, fontSize: 12, textTransform: 'capitalize' }}>
                  {svc.status}
                </span>
                {svc.latency && <span style={{ color: '#64748b', fontSize: 12 }}>{svc.latency}ms</span>}
                {svc.statusCode && <span style={{ color: '#475569', fontSize: 12 }}>HTTP {svc.statusCode}</span>}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const s = {
  statCard: { background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px' },
  card: { background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: 20 },
}

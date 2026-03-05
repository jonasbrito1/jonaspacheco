import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Plus } from 'lucide-react'
import api from '../services/api'

const STATUS_COLOR = { aberto: '#00d4ff', em_andamento: '#f59e0b', resolvido: '#10b981', fechado: '#475569' }
const STATUS_LABEL = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido', fechado: 'Fechado' }
const CAT_LABEL = { suporte: 'Suporte', bug: 'Bug', melhoria: 'Melhoria', duvida: 'Dúvida', outro: 'Outro' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return m + 'min'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h'
  const d = Math.floor(h / 24)
  return d < 30 ? d + 'd' : Math.floor(d / 30) + 'mes'
}

export default function MyTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/my').then(r => setTickets(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: '#64748b', textAlign: 'center', paddingTop: 40 }}>Carregando...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Meus Chamados</h2>
          <p style={{ color: '#64748b', fontSize: 14 }}>{tickets.length} chamado(s) encontrado(s)</p>
        </div>
        <Link to="/novo" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, textDecoration: 'none', padding: '10px 18px', fontSize: 13 }}>
          <Plus size={15} /> Novo chamado
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#161b27', borderRadius: 12, border: '1px solid #1e293b' }}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>Você ainda não abriu nenhum chamado.</p>
          <Link to="/novo" style={{ background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, textDecoration: 'none', padding: '10px 20px', fontSize: 14 }}>
            Abrir primeiro chamado
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tickets.map(t => (
            <Link key={t.id} to={'/meus-chamados/' + t.id} style={{ textDecoration: 'none' }}>
              <div style={{
                padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                background: '#161b27', border: '1px solid #1e293b',
                borderLeft: '3px solid ' + (STATUS_COLOR[t.status] || '#475569'),
                transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>
                    <span style={{ color: '#475569', marginRight: 6, fontSize: 13 }}>#{t.id}</span>
                    {t.title}
                  </span>
                  <span style={{
                    background: (STATUS_COLOR[t.status] || '#475569') + '22',
                    color: STATUS_COLOR[t.status] || '#475569',
                    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                  }}>{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                  <span>{CAT_LABEL[t.category] || t.category}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {timeAgo(t.updated_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

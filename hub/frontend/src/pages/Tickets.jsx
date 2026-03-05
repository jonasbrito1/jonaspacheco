import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, X, Send, Trash2 } from 'lucide-react'

const STATUS = {
  aberto:       { label: 'Aberto',       color: '#00d4ff' },
  em_andamento: { label: 'Em Andamento', color: '#f59e0b' },
  resolvido:    { label: 'Resolvido',    color: '#10b981' },
  fechado:      { label: 'Fechado',      color: '#475569' },
}

const PRIORITY = {
  baixa:   { label: 'Baixa',   color: '#64748b' },
  media:   { label: 'Média',   color: '#00d4ff' },
  alta:    { label: 'Alta',    color: '#f59e0b' },
  critica: { label: 'Crítica', color: '#f87171' },
}

const empty = { title: '', description: '', project_id: '', priority: 'media', client_name: '', client_email: '' }

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const currentUser = JSON.parse(localStorage.getItem('hub_user') || '{}')

  const load = () => api.get('/tickets').then(r => setTickets(r.data))

  useEffect(() => {
    load()
    api.get('/projects').then(r => setProjects(r.data))
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const openTicket = async t => {
    setSelected(t.id)
    const { data } = await api.get(`/tickets/${t.id}`)
    setDetail(data)
    setReply('')
  }

  const closeDetail = () => { setSelected(null); setDetail(null) }

  const sendReply = async () => {
    if (!reply.trim()) return
    setSending(true)
    await api.post(`/tickets/${selected}/messages`, { message: reply })
    setReply('')
    const { data } = await api.get(`/tickets/${selected}`)
    setDetail(data)
    setSending(false)
  }

  const changeStatus = async status => {
    await api.put(`/tickets/${selected}`, { ...detail, status })
    const { data } = await api.get(`/tickets/${selected}`)
    setDetail(data)
    load()
  }

  const assignTo = async userId => {
    await api.put(`/tickets/${selected}`, { ...detail, assigned_to: userId || null })
    const { data } = await api.get(`/tickets/${selected}`)
    setDetail(data)
    load()
  }

  const removeTicket = async id => {
    if (!confirm('Excluir ticket?')) return
    await api.delete(`/tickets/${id}`)
    if (selected === id) closeDetail()
    load()
  }

  const save = async e => {
    e.preventDefault()
    await api.post('/tickets', form)
    setModal(false)
    setForm(empty)
    load()
  }

  const filtered = filter === 'todos' ? tickets : tickets.filter(t => t.status === filter)

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* PAINEL ESQUERDO: lista */}
      <div style={{ width: selected ? 360 : '100%', minWidth: selected ? 360 : 'auto', display: 'flex', flexDirection: 'column', gap: 16, transition: 'width .2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Tickets</h2>
          <button onClick={() => setModal(true)} style={s.btnPrimary}><Plus size={16} /> Novo Ticket</button>
        </div>

        {/* Filtros por status */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', ...Object.keys(STATUS)].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 12px', borderRadius: 20, border: '1px solid #1e293b', fontSize: 12, cursor: 'pointer',
              background: filter === f ? '#00d4ff' : 'none',
              color: filter === f ? '#0f1117' : '#94a3b8',
            }}>
              {f === 'todos' ? `Todos (${tickets.length})` : `${STATUS[f].label} (${tickets.filter(t => t.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {filtered.map(t => (
            <div key={t.id} onClick={() => openTicket(t)} style={{
              ...s.card, cursor: 'pointer',
              borderLeft: `3px solid ${STATUS[t.status]?.color || '#475569'}`,
              background: selected === t.id ? '#1e293b' : '#161b27',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, marginRight: 8 }}>#{t.id} {t.title}</span>
                <span style={{ background: PRIORITY[t.priority]?.color + '22', color: PRIORITY[t.priority]?.color, padding: '2px 8px', borderRadius: 10, fontSize: 11, whiteSpace: 'nowrap' }}>
                  {PRIORITY[t.priority]?.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 12 }}>
                  {t.client_name || t.creator_name || 'Interno'}
                  {t.project_name ? ` · ${t.project_name}` : ''}
                </span>
                <span style={{ background: STATUS[t.status]?.color + '22', color: STATUS[t.status]?.color, padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>
                  {STATUS[t.status]?.label}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ color: '#475569', fontSize: 11 }}>{new Date(t.updated_at).toLocaleDateString('pt-BR')}</span>
                {t.assigned_name && <span style={{ color: '#64748b', fontSize: 11 }}>→ {t.assigned_name}</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#475569', padding: '20px 0' }}>Nenhum ticket encontrado.</p>}
        </div>
      </div>

      {/* PAINEL DIREITO: detalhe */}
      {selected && detail && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', background: '#0f1117', borderRadius: 12, padding: 24, border: '1px solid #1e293b' }}>
          {/* Cabeçalho */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>#{detail.id} {detail.title}</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                {detail.client_name && <span>Cliente: <strong style={{ color: '#94a3b8' }}>{detail.client_name}</strong></span>}
                {detail.client_email && <span>{detail.client_email}</span>}
                {detail.project_name && <span>Projeto: <strong style={{ color: '#94a3b8' }}>{detail.project_name}</strong></span>}
                <span>Criado em: {new Date(detail.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => removeTicket(selected)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
              <button onClick={closeDetail} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
            </div>
          </div>

          {/* Ações: status */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid #1e293b', paddingTop: 16 }}>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center', marginRight: 4 }}>Status:</span>
            {Object.entries(STATUS).map(([k, v]) => (
              <button key={k} onClick={() => changeStatus(k)} style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${v.color}44`,
                background: detail.status === k ? v.color + '33' : 'none',
                color: detail.status === k ? v.color : '#64748b',
                fontWeight: detail.status === k ? 700 : 400,
              }}>{v.label}</button>
            ))}
          </div>

          {/* Atribuição */}
          {users.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Atribuído a:</span>
              <select
                value={detail.assigned_to || ''}
                onChange={e => assignTo(e.target.value || null)}
                style={{ ...s.input, padding: '6px 10px', fontSize: 13, flex: 1, maxWidth: 220 }}
              >
                <option value="">Não atribuído</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
              <span style={{ fontSize: 12, background: PRIORITY[detail.priority]?.color + '22', color: PRIORITY[detail.priority]?.color, padding: '3px 10px', borderRadius: 20 }}>
                {PRIORITY[detail.priority]?.label}
              </span>
            </div>
          )}

          {/* Descrição */}
          {detail.description && (
            <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{detail.description}</p>
            </div>
          )}

          {/* Thread de mensagens */}
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12 }}>
              Histórico · {detail.messages?.length || 0} mensagem(s)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detail.messages?.map(msg => (
                <div key={msg.id} style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: msg.user_role === 'admin' ? '#00d4ff' : '#a78bfa' }}>
                      {msg.user_name || msg.author_name || 'Sistema'}
                    </span>
                    <span style={{ fontSize: 11, color: '#475569' }}>{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#e2e8f0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.message}</p>
                </div>
              ))}
              {detail.messages?.length === 0 && <p style={{ color: '#475569', fontSize: 13 }}>Nenhuma mensagem ainda.</p>}
            </div>
          </div>

          {/* Input de resposta */}
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Escrever resposta... (Ctrl+Enter para enviar)"
              style={{ ...s.input, flex: 1, resize: 'none', height: 80 }}
              onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') sendReply() }}
            />
            <button onClick={sendReply} disabled={sending || !reply.trim()} style={{ ...s.btnPrimary, alignSelf: 'flex-end', padding: '12px 16px', opacity: reply.trim() ? 1 : 0.5 }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: novo ticket */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Novo Ticket</h3>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={s.input} placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Descrição do problema" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input style={s.input} placeholder="Nome do cliente" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              <input style={s.input} type="email" placeholder="Email do cliente" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              <select style={s.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select style={s.input} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">Sem projeto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" style={s.btnPrimary}>Criar Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  card: { border: '1px solid #1e293b', borderRadius: 12, padding: 14 },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnSecondary: { flex: 1, padding: '10px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer' },
  input: { padding: '10px 14px', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, width: '100%', boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#161b27', borderRadius: 16, padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #1e293b' },
}

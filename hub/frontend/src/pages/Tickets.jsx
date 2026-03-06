import React, { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { Plus, X, Send, Trash2, Lock, Globe, Clock, Paperclip, Image } from 'lucide-react'

const STATUS = {
  aberto:       { label: 'Aberto',       color: '#FFDF00' },
  em_andamento: { label: 'Em Andamento', color: '#F97316' },
  resolvido:    { label: 'Resolvido',    color: '#009C3B' },
  fechado:      { label: 'Fechado',      color: '#4A6B87' },
}

const PRIORITY = {
  baixa:   { label: 'Baixa',   color: '#4A6B87' },
  media:   { label: 'Media',   color: '#FFDF00' },
  alta:    { label: 'Alta',    color: '#F97316' },
  critica: { label: 'Critica', color: '#f87171' },
}

const URGENCY = {
  baixa:   { label: 'Baixa',   color: '#4A6B87' },
  media:   { label: 'Media',   color: '#FFDF00' },
  alta:    { label: 'Alta',    color: '#F97316' },
  critica: { label: 'Critica', color: '#f87171' },
}

const CATEGORY = {
  suporte:  { label: 'Suporte',  color: '#1E6FD9' },
  bug:      { label: 'Bug',      color: '#EF4444' },
  melhoria: { label: 'Melhoria', color: '#009C3B' },
  duvida:   { label: 'Duvida',   color: '#F97316' },
  outro:    { label: 'Outro',    color: '#4A6B87' },
}

const emptyForm = {
  title: '', description: '', project_id: '', priority: 'media',
  urgency: 'media', category: 'suporte', client_name: '', client_email: '',
  assigned_to: '',
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return m + 'min'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h'
  const d = Math.floor(h / 24)
  if (d < 30) return d + 'd'
  return Math.floor(d / 30) + 'mes'
}

function Badge({ label, color, small }) {
  return (
    <span style={{
      background: color + '22', color,
      padding: small ? '1px 7px' : '2px 9px',
      borderRadius: 10, fontSize: small ? 10 : 11,
      fontWeight: 500, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

function Attachment({ url, name, type }) {
  const isImage = type && type.startsWith('image/')
  const src = url // already relative: /uploads/tickets/...
  if (isImage) {
    return (
      <a href={src} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8 }}>
        <img src={src} alt={name} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 6, border: '1px solid #1a3a5c', cursor: 'zoom-in' }} />
      </a>
    )
  }
  return (
    <a href={src} download={name} target="_blank" rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 12px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 6, color: '#8BAFC8', fontSize: 13, textDecoration: 'none' }}>
      <Paperclip size={13} /> {name || 'Anexo'}
    </a>
  )
}

export default function Tickets() {
  const [tickets, setTickets] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterCategory, setFilterCategory] = useState('todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [attachment, setAttachment] = useState(null)     // File
  const [attachPreview, setAttachPreview] = useState(null) // object URL for image preview
  const fileInputRef = useRef(null)

  const load = () => api.get('/tickets').then(r => setTickets(r.data))

  useEffect(() => {
    load()
    api.get('/projects').then(r => setProjects(r.data))
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const openTicket = async t => {
    setSelected(t.id)
    const { data } = await api.get('/tickets/' + t.id)
    setDetail(data)
    setReply('')
    setIsInternal(false)
    clearAttachment()
  }

  const closeDetail = () => { setSelected(null); setDetail(null) }

  const clearAttachment = () => {
    if (attachPreview) URL.revokeObjectURL(attachPreview)
    setAttachment(null)
    setAttachPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const pickFile = file => {
    if (!file) return
    clearAttachment()
    setAttachment(file)
    if (file.type.startsWith('image/')) {
      setAttachPreview(URL.createObjectURL(file))
    }
  }

  const handleFileInput = e => pickFile(e.target.files[0])

  const handlePaste = e => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) pickFile(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }))
        return
      }
    }
  }

  const sendReply = async () => {
    if (!reply.trim() && !attachment) return
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('message', reply)
      fd.append('is_internal', isInternal)
      if (attachment) fd.append('attachment', attachment)
      await api.post('/tickets/' + selected + '/messages', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReply('')
      clearAttachment()
      const { data } = await api.get('/tickets/' + selected)
      setDetail(data)
      load()
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async status => {
    await api.put('/tickets/' + selected, { ...detail, status })
    const { data } = await api.get('/tickets/' + selected)
    setDetail(data)
    load()
  }

  const updateField = async (field, value) => {
    const updated = { ...detail, [field]: value }
    await api.put('/tickets/' + selected, updated)
    const { data } = await api.get('/tickets/' + selected)
    setDetail(data)
    load()
  }

  const removeTicket = async id => {
    if (!confirm('Excluir este ticket?')) return
    await api.delete('/tickets/' + id)
    if (selected === id) closeDetail()
    load()
  }

  const save = async e => {
    e.preventDefault()
    await api.post('/tickets', form)
    setModal(false)
    setForm(emptyForm)
    load()
  }

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'todos' && t.status !== filterStatus) return false
    if (filterCategory !== 'todos' && t.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return (t.title || '').toLowerCase().includes(q) ||
             (t.client_name || '').toLowerCase().includes(q) ||
             (t.client_email || '').toLowerCase().includes(q)
    }
    return true
  })

  const countByStatus = s => tickets.filter(t => t.status === s).length
  const canSend = !sending && (reply.trim() || attachment)

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      <div style={{
        width: selected ? 380 : '100%', minWidth: selected ? 380 : 'auto',
        display: 'flex', flexDirection: 'column', gap: 0,
        borderRight: selected ? '1px solid #1a3a5c' : 'none',
        paddingRight: selected ? 16 : 0,
      }}>
        <div style={{ paddingBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Tickets</h2>
            <button onClick={() => setModal(true)} style={s.btnPrimary}><Plus size={15} /> Novo</button>
          </div>
          <input style={{ ...s.input, fontSize: 13 }} placeholder="Buscar titulo, cliente ou email..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterStatus('todos')} style={s.pill(filterStatus === 'todos', '#FFDF00')}>Todos ({tickets.length})</button>
            {Object.entries(STATUS).map(([k, v]) => (
              <button key={k} onClick={() => setFilterStatus(k)} style={s.pill(filterStatus === k, v.color)}>
                {v.label} ({countByStatus(k)})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterCategory('todos')} style={s.pill(filterCategory === 'todos', '#4A6B87', true)}>Categorias</button>
            {Object.entries(CATEGORY).map(([k, v]) => (
              <button key={k} onClick={() => setFilterCategory(k)} style={s.pill(filterCategory === k, v.color, true)}>{v.label}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(t => (
            <div key={t.id} onClick={() => openTicket(t)} style={{
              padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
              background: selected === t.id ? '#081526' : '#0d1e35',
              border: '1px solid ' + (selected === t.id ? '#254d6e' : '#1a3a5c'),
              borderLeft: '3px solid ' + (STATUS[t.status] ? STATUS[t.status].color : '#4A6B87'),
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.4 }}>
                  <span style={{ color: '#4A6B87', marginRight: 4 }}>{'#' + t.id}</span>{t.title}
                </span>
                <Badge label={PRIORITY[t.priority] ? PRIORITY[t.priority].label : t.priority} color={PRIORITY[t.priority] ? PRIORITY[t.priority].color : '#4A6B87'} small />
              </div>
              <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                <Badge label={CATEGORY[t.category] ? CATEGORY[t.category].label : (t.category || 'suporte')} color={CATEGORY[t.category] ? CATEGORY[t.category].color : '#1E6FD9'} small />
                <Badge label={STATUS[t.status] ? STATUS[t.status].label : t.status} color={STATUS[t.status] ? STATUS[t.status].color : '#4A6B87'} small />
                {t.urgency && t.urgency !== 'media' && (
                  <Badge label={'Urgencia ' + (URGENCY[t.urgency] ? URGENCY[t.urgency].label : t.urgency)} color={URGENCY[t.urgency] ? URGENCY[t.urgency].color : '#4A6B87'} small />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4A6B87' }}>
                <span>{t.client_name || t.creator_name || 'Interno'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {t.assigned_name && <span style={{ color: '#8BAFC8' }}>{'-> ' + t.assigned_name}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{timeAgo(t.updated_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#4A6B87', textAlign: 'center', padding: '40px 0', fontSize: 13 }}>Nenhum ticket encontrado.</p>}
        </div>
      </div>

      {selected && detail && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingLeft: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <p style={{ color: '#4A6B87', fontSize: 12, marginBottom: 4 }}>{'Ticket #' + detail.id + ' - ' + new Date(detail.created_at).toLocaleString('pt-BR')}</p>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{detail.title}</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={CATEGORY[detail.category] ? CATEGORY[detail.category].label : 'suporte'} color={CATEGORY[detail.category] ? CATEGORY[detail.category].color : '#1E6FD9'} />
                  <Badge label={'Urgencia: ' + (URGENCY[detail.urgency] ? URGENCY[detail.urgency].label : (detail.urgency || 'media'))} color={URGENCY[detail.urgency] ? URGENCY[detail.urgency].color : '#FFDF00'} />
                  <Badge label={'Prioridade: ' + (PRIORITY[detail.priority] ? PRIORITY[detail.priority].label : detail.priority)} color={PRIORITY[detail.priority] ? PRIORITY[detail.priority].color : '#FFDF00'} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => removeTicket(selected)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 6 }}><Trash2 size={15} /></button>
                <button onClick={closeDetail} style={{ background: 'none', border: 'none', color: '#4A6B87', cursor: 'pointer', padding: 6 }}><X size={18} /></button>
              </div>
            </div>
            {(detail.client_name || detail.client_email) && (
              <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13 }}>
                <span style={{ color: '#4A6B87', marginRight: 12 }}>Cliente:</span>
                <strong style={{ marginRight: 12 }}>{detail.client_name || '-'}</strong>
                {detail.client_email && <a href={'mailto:' + detail.client_email} style={{ color: '#FFDF00', fontSize: 12 }}>{detail.client_email}</a>}
              </div>
            )}
          </div>

          <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#4A6B87', marginBottom: 8 }}>Status</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.entries(STATUS).map(([k, v]) => (
                <button key={k} onClick={() => changeStatus(k)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                  border: '1px solid ' + v.color + '55',
                  background: detail.status === k ? v.color + '33' : 'none',
                  color: detail.status === k ? v.color : '#4A6B87',
                  fontWeight: detail.status === k ? 700 : 400,
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <p style={{ fontSize: 11, color: '#4A6B87', marginBottom: 4 }}>Atribuido a</p>
                <select value={detail.assigned_to || ''} onChange={e => updateField('assigned_to', e.target.value || null)} style={{ ...s.input, padding: '6px 10px', fontSize: 12 }}>
                  <option value="">Nao atribuido</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 120 }}>
                <p style={{ fontSize: 11, color: '#4A6B87', marginBottom: 4 }}>Prioridade</p>
                <select value={detail.priority} onChange={e => updateField('priority', e.target.value)} style={{ ...s.input, padding: '6px 10px', fontSize: 12 }}>
                  {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 120 }}>
                <p style={{ fontSize: 11, color: '#4A6B87', marginBottom: 4 }}>Urgencia</p>
                <select value={detail.urgency || 'media'} onChange={e => updateField('urgency', e.target.value)} style={{ ...s.input, padding: '6px 10px', fontSize: 12 }}>
                  {Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ minWidth: 120 }}>
                <p style={{ fontSize: 11, color: '#4A6B87', marginBottom: 4 }}>Categoria</p>
                <select value={detail.category || 'suporte'} onChange={e => updateField('category', e.target.value)} style={{ ...s.input, padding: '6px 10px', fontSize: 12 }}>
                  {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {detail.description && (
            <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#4A6B87', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Descricao</p>
              <p style={{ fontSize: 14, color: '#8BAFC8', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{detail.description}</p>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#4A6B87', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
              {'Historico - ' + (detail.messages ? detail.messages.length : 0) + ' mensagem(s)'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detail.messages && detail.messages.map(msg => (
                <div key={msg.id} style={{
                  borderRadius: 10, padding: '12px 16px',
                  background: msg.is_internal ? '#112640' : '#081526',
                  border: '1px solid ' + (msg.is_internal ? '#F9731622' : '#FFDF0022'),
                  borderLeft: '3px solid ' + (msg.is_internal ? '#F97316' : '#FFDF00'),
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {msg.is_internal ? <Lock size={12} color="#F97316" /> : <Globe size={12} color="#FFDF00" />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: msg.is_internal ? '#F97316' : '#FFDF00' }}>
                        {msg.user_name || msg.author_name || 'Sistema'}
                      </span>
                      {msg.is_internal && <span style={{ fontSize: 10, background: '#F9731622', color: '#F97316', padding: '1px 6px', borderRadius: 4 }}>nota interna</span>}
                    </div>
                    <span style={{ fontSize: 11, color: '#4A6B87' }}>{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {msg.message && <p style={{ fontSize: 14, color: '#EEF2FF', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{msg.message}</p>}
                  {msg.attachment_url && (
                    <Attachment url={msg.attachment_url} name={msg.attachment_name} type={msg.attachment_type} />
                  )}
                </div>
              ))}
              {(!detail.messages || detail.messages.length === 0) && <p style={{ color: '#4A6B87', fontSize: 13 }}>Nenhuma mensagem ainda.</p>}
            </div>
          </div>

          {/* Reply area */}
          <div style={{ background: '#0d1e35', border: '1px solid ' + (isInternal ? '#F9731688' : '#1a3a5c'), borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: '#4A6B87', fontWeight: 600, margin: 0 }}>
                {isInternal ? 'Nota interna (nao enviada ao cliente)' : 'Resposta publica (notifica cliente por email)'}
              </p>
              <button onClick={() => setIsInternal(v => !v)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                border: '1px solid ' + (isInternal ? '#F97316' : '#254d6e'),
                background: isInternal ? '#F9731622' : 'none',
                color: isInternal ? '#F97316' : '#4A6B87',
              }}>
                {isInternal ? 'Interna' : 'Publica'}
              </button>
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div style={{ marginBottom: 10, padding: '8px 10px', background: '#06101e', borderRadius: 8, border: '1px solid #1a3a5c', display: 'flex', alignItems: 'center', gap: 10 }}>
                {attachPreview
                  ? <img src={attachPreview} alt="preview" style={{ height: 48, borderRadius: 4, objectFit: 'cover' }} />
                  : <Paperclip size={16} color="#8BAFC8" />
                }
                <span style={{ fontSize: 12, color: '#8BAFC8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
                <button onClick={clearAttachment} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea value={reply} onChange={e => setReply(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={isInternal
                    ? 'Nota interna... (Ctrl+Enter envia, Cole prints com Ctrl+V)'
                    : 'Resposta ao cliente... (Ctrl+Enter envia, Cole prints com Ctrl+V)'}
                  style={{ ...s.input, resize: 'none', height: 80, borderColor: isInternal ? '#F9731688' : '#1a3a5c', paddingRight: 40 }}
                  onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') sendReply() }}
                />
                {/* File attach button inside textarea */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivo"
                  style={{ position: 'absolute', bottom: 8, right: 8, background: 'none', border: 'none', color: '#4A6B87', cursor: 'pointer', padding: 2 }}
                >
                  <Paperclip size={15} />
                </button>
              </div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                accept="image/*,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx"
                onChange={handleFileInput} />
              <button onClick={sendReply} disabled={!canSend} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 16px', border: 'none', borderRadius: 8,
                cursor: canSend ? 'pointer' : 'default',
                alignSelf: 'flex-end', opacity: canSend ? 1 : 0.4,
                background: isInternal ? '#F97316' : '#FFDF00', color: '#020c1b',
              }}><Send size={15} /></button>
            </div>
            <p style={{ fontSize: 11, color: '#254d6e', marginTop: 6, margin: '6px 0 0' }}>
              Cole screenshots com Ctrl+V • Clique em <Paperclip size={10} style={{ verticalAlign: 'middle' }} /> para anexar arquivo
            </p>
          </div>
        </div>
      )}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>Novo Ticket</h3>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={s.input} placeholder="Titulo *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Descricao do problema" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={s.label}>Categoria</p>
                  <select style={s.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {Object.entries(CATEGORY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={s.label}>Urgencia</p>
                  <select style={s.input} value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                    {Object.entries(URGENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={s.label}>Prioridade</p>
                  <select style={s.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={s.label}>Atribuir a</p>
                  <select style={s.input} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">Nao atribuido</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #1a3a5c' }} />
              <input style={s.input} placeholder="Nome do cliente" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              <input style={s.input} type="email" placeholder="Email do cliente (para notificacoes)" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
              <select style={s.input} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">Sem projeto vinculado</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
  pill: (active, color, small) => ({
    padding: small ? '3px 10px' : '4px 12px',
    borderRadius: 20, fontSize: small ? 11 : 12, cursor: 'pointer',
    border: '1px solid ' + color + '44',
    background: active ? color + '22' : 'none',
    color: active ? color : '#4A6B87',
    fontWeight: active ? 600 : 400,
  }),
  label: { fontSize: 11, color: '#4A6B87', marginBottom: 4, marginTop: 0 },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
  btnSecondary: { flex: 1, padding: '10px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 8, color: '#8BAFC8', cursor: 'pointer' },
  input: { padding: '9px 12px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: '#00000099', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#081526', borderRadius: 16, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #1a3a5c' },
}

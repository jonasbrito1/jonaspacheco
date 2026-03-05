import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, X, CheckCircle } from 'lucide-react'
import api from '../services/api'

const CATEGORIES = [
  { value: 'suporte', label: 'Suporte técnico' },
  { value: 'bug', label: 'Bug / Erro no sistema' },
  { value: 'melhoria', label: 'Melhoria / Nova funcionalidade' },
  { value: 'duvida', label: 'Dúvida' },
  { value: 'outro', label: 'Outro' },
]

const URGENCY = [
  { value: 'baixa', label: 'Baixa — sem urgência' },
  { value: 'media', label: 'Média — impacta parcialmente' },
  { value: 'alta', label: 'Alta — sistema comprometido' },
  { value: 'critica', label: 'Crítica — fora do ar' },
]

export default function OpenTicket() {
  const [form, setForm] = useState({ name: '', email: '', title: '', description: '', category: 'suporte', urgency: 'media' })
  const [attachment, setAttachment] = useState(null)
  const [attachPreview, setAttachPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()
  const navigate = useNavigate()

  const user = (() => { try { return JSON.parse(localStorage.getItem('portal_user')) } catch { return null } })()

  const pickFile = file => {
    if (!file) return
    setAttachment(file)
    setAttachPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  const handlePaste = e => {
    for (const item of e.clipboardData?.items || []) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) pickFile(new File([file], `print-${Date.now()}.png`, { type: file.type }))
        return
      }
    }
  }

  const submit = async e => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (attachment) fd.append('attachment', attachment)
      const { data } = await api.post('/tickets', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setDone(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <CheckCircle size={52} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Chamado aberto!</h2>
          <p style={{ color: '#64748b', fontSize: 15 }}>
            Protocolo <strong style={{ color: '#00d4ff' }}>#{done.id}</strong>
          </p>
        </div>

        {/* Próximos passos */}
        <div style={{ background: '#0f1a2e', border: '1px solid #00d4ff33', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff', marginBottom: 14 }}>📧 Verifique seu email</p>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 0 }}>
            Enviamos um email de confirmação para <strong style={{ color: '#e2e8f0' }}>{form.email}</strong> com o
            <strong style={{ color: '#00d4ff' }}> link para acompanhar</strong> seu chamado.
            Use esse link para ver respostas e adicionar informações — <strong style={{ color: '#e2e8f0' }}>sem precisar criar conta</strong>.
          </p>
        </div>

        <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Quer histórico de todos seus chamados?</p>
          <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
            Crie uma conta com o mesmo email e todos os seus chamados ficam disponíveis em um só lugar.
          </p>
          <a href="/cadastro" style={{ fontSize: 13, color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
            Criar conta grátis →
          </a>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/acompanhar/' + done.token)} style={{ ...btnPrimary, flex: 1 }}>
            Acompanhar agora
          </button>
          <button onClick={() => { setDone(null); setForm({ name: '', email: '', title: '', description: '', category: 'suporte', urgency: 'media' }) }} style={{ ...btnSecondary, flex: 1 }}>
            Abrir outro chamado
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Abrir Chamado</h2>
      <p style={{ color: '#64748b', marginBottom: 28, fontSize: 14 }}>
        Descreva o problema ou solicitação. Nossa equipe responderá em breve.
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lb}>Seu nome *</label>
            <input style={inp} placeholder="João Silva" value={user?.name || form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              readOnly={!!user?.name} />
          </div>
          <div>
            <label style={lb}>Seu email *</label>
            <input style={inp} type="email" placeholder="joao@email.com" value={user?.email || form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
              readOnly={!!user?.email} />
          </div>
        </div>

        <div>
          <label style={lb}>Assunto *</label>
          <input style={inp} placeholder="Descreva brevemente o problema" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lb}>Categoria</label>
            <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lb}>Urgência</label>
            <select style={inp} value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
              {URGENCY.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lb}>Descrição detalhada</label>
          <div style={{ position: 'relative' }}>
            <textarea
              style={{ ...inp, minHeight: 140, resize: 'vertical', paddingRight: 44 }}
              placeholder="Descreva o problema com o máximo de detalhes possível... (Cole prints com Ctrl+V)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              onPaste={handlePaste}
            />
            <button type="button" onClick={() => fileRef.current?.click()}
              title="Anexar arquivo"
              style={{ position: 'absolute', bottom: 10, right: 10, background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
              <Paperclip size={18} />
            </button>
          </div>
          <input ref={fileRef} type="file" style={{ display: 'none' }}
            accept="image/*,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx"
            onChange={e => pickFile(e.target.files[0])} />
        </div>

        {attachment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#161b27', border: '1px solid #1e293b', borderRadius: 8 }}>
            {attachPreview
              ? <img src={attachPreview} alt="preview" style={{ height: 40, borderRadius: 4, objectFit: 'cover' }} />
              : <Paperclip size={16} color="#94a3b8" />}
            <span style={{ fontSize: 13, color: '#94a3b8', flex: 1 }}>{attachment.name}</span>
            <button type="button" onClick={() => { setAttachment(null); setAttachPreview(null) }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}

        {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={sending} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1, alignSelf: 'flex-start', padding: '12px 32px', fontSize: 15 }}>
          {sending ? 'Enviando...' : 'Enviar chamado'}
        </button>
      </form>
    </div>
  )
}

const lb = { fontSize: 13, color: '#94a3b8', marginBottom: 6, display: 'block' }
const inp = { width: '100%', padding: '10px 14px', background: '#161b27', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '11px 24px', fontSize: 14 }
const btnSecondary = { background: 'none', border: '1px solid #334155', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '11px 24px', fontSize: 14 }

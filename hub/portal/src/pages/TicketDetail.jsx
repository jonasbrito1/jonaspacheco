import React, { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, Paperclip, X, Globe, ArrowLeft } from 'lucide-react'
import api from '../services/api'

const STATUS_COLOR = { aberto: '#FFDF00', em_andamento: '#F97316', resolvido: '#009C3B', fechado: '#4A6B87' }
const STATUS_LABEL = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido', fechado: 'Fechado' }

export default function TicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [attachPreview, setAttachPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [replyDone, setReplyDone] = useState(false)
  const fileRef = useRef()

  const load = () => {
    api.get('/my/' + id)
      .then(r => setTicket(r.data))
      .catch(() => setError('Ticket não encontrado.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

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

  const sendReply = async () => {
    if (!reply.trim() && !attachment) return
    setSending(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('message', reply)
      if (attachment) fd.append('attachment', attachment)
      await api.post('/my/' + id + '/reply', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setReply('')
      setAttachment(null)
      setAttachPreview(null)
      setReplyDone(true)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p style={{ color: '#4A6B87', textAlign: 'center', paddingTop: 40 }}>Carregando...</p>
  if (!ticket) return <p style={{ color: '#f87171', textAlign: 'center', paddingTop: 40 }}>{error}</p>

  const closed = ['resolvido', 'fechado'].includes(ticket.status)

  return (
    <div>
      <Link to="/meus-chamados" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4A6B87', textDecoration: 'none', fontSize: 14, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Voltar
      </Link>

      <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#4A6B87', fontSize: 12, marginBottom: 6 }}>
              Chamado #{ticket.id} · {new Date(ticket.created_at).toLocaleString('pt-BR')}
            </p>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 0 }}>{ticket.title}</h2>
          </div>
          <span style={{
            background: (STATUS_COLOR[ticket.status] || '#4A6B87') + '22',
            color: STATUS_COLOR[ticket.status] || '#4A6B87',
            padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
          }}>{STATUS_LABEL[ticket.status] || ticket.status}</span>
        </div>
        {ticket.description && (
          <div style={{ marginTop: 14, background: '#081526', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#8BAFC8', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {ticket.description}
          </div>
        )}
      </div>

      <h3 style={{ fontSize: 13, color: '#4A6B87', fontWeight: 600, textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
        Histórico · {ticket.messages?.length || 0} mensagem(s)
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {ticket.messages?.map(msg => {
          const isSupport = !!msg.user_id
          return (
            <div key={msg.id} style={{
              borderRadius: 10, padding: '14px 18px',
              background: isSupport ? '#081526' : '#0d1e35',
              border: '1px solid ' + (isSupport ? '#FFDF0022' : '#1a3a5c'),
              borderLeft: '3px solid ' + (isSupport ? '#FFDF00' : '#4A6B87'),
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={12} color={isSupport ? '#FFDF00' : '#4A6B87'} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isSupport ? '#FFDF00' : '#8BAFC8' }}>
                    {isSupport ? (msg.user_name || 'Equipe de Suporte') : (msg.author_name || 'Você')}
                  </span>
                  {isSupport && <span style={{ fontSize: 10, background: '#FFDF0022', color: '#FFDF00', padding: '1px 6px', borderRadius: 4 }}>equipe</span>}
                </div>
                <span style={{ fontSize: 11, color: '#4A6B87' }}>{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
              </div>
              {msg.message && <p style={{ fontSize: 14, color: '#EEF2FF', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>{msg.message}</p>}
              {msg.attachment_url && <AttachmentDisplay url={msg.attachment_url} name={msg.attachment_name} type={msg.attachment_type} />}
            </div>
          )
        })}
        {(!ticket.messages || ticket.messages.length === 0) && (
          <p style={{ color: '#4A6B87', fontSize: 14 }}>Ainda sem respostas. Aguarde nossa equipe.</p>
        )}
      </div>

      {closed ? (
        <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 10, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ color: '#4A6B87', fontSize: 14, marginBottom: 16 }}>Chamado encerrado. Abra um novo se precisar de mais ajuda.</p>
          <Link to="/novo" style={{ background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 800, textDecoration: 'none', padding: '10px 20px', fontSize: 14, display: 'inline-block' }}>
            Novo chamado
          </Link>
        </div>
      ) : (
        <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 10, padding: 20 }}>
          <p style={{ fontSize: 13, color: '#4A6B87', marginBottom: 12, fontWeight: 600 }}>Adicionar informação</p>
          {replyDone && <p style={{ color: '#009C3B', fontSize: 13, marginBottom: 10 }}>Enviado! Nossa equipe foi notificada.</p>}

          {attachment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 8, marginBottom: 10 }}>
              {attachPreview ? <img src={attachPreview} alt="" style={{ height: 36, borderRadius: 4, objectFit: 'cover' }} /> : <Paperclip size={14} color="#8BAFC8" />}
              <span style={{ fontSize: 12, color: '#8BAFC8', flex: 1 }}>{attachment.name}</span>
              <button onClick={() => { setAttachment(null); setAttachPreview(null) }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><X size={13} /></button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                style={{ ...inp, height: 80, resize: 'none', paddingRight: 44 }}
                placeholder="Adicione mais informações... (Ctrl+Enter envia, cole prints com Ctrl+V)"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') sendReply() }}
              />
              <button type="button" onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: 10, right: 10, background: 'none', border: 'none', color: '#4A6B87', cursor: 'pointer' }}>
                <Paperclip size={16} />
              </button>
            </div>
            <input ref={fileRef} type="file" style={{ display: 'none' }}
              accept="image/*,.pdf,.txt,.zip,.doc,.docx"
              onChange={e => pickFile(e.target.files[0])} />
            <button onClick={sendReply} disabled={sending || (!reply.trim() && !attachment)} style={{
              background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 800,
              cursor: 'pointer', padding: '12px 16px', alignSelf: 'flex-end',
              opacity: (reply.trim() || attachment) && !sending ? 1 : 0.4,
            }}><Send size={16} /></button>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{error}</p>}
        </div>
      )}
    </div>
  )
}

function AttachmentDisplay({ url, name, type }) {
  if (type?.startsWith('image/')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8 }}>
        <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 6, border: '1px solid #1a3a5c' }} />
      </a>
    )
  }
  return (
    <a href={url} download={name} target="_blank" rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '6px 12px', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 6, color: '#8BAFC8', fontSize: 13, textDecoration: 'none' }}>
      <Paperclip size={13} /> {name || 'Anexo'}
    </a>
  )
}

const inp = { width: '100%', padding: '10px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF', fontSize: 14, boxSizing: 'border-box' }

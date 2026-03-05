import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../services/api'
import {
  X, Play, Square, Clock, Plus, Trash2, Paperclip, MessageSquare,
  CheckSquare, Tag, Users, Calendar, Flag, ChevronRight, Download,
} from 'lucide-react'

const PRIORITY_OPTS = [
  { value: 'none',    label: 'Nenhuma', color: '#475569' },
  { value: 'baixa',   label: 'Baixa',   color: '#22c55e' },
  { value: 'media',   label: 'Média',  color: '#eab308' },
  { value: 'alta',    label: 'Alta',    color: '#f97316' },
  { value: 'critica', label: 'Crítica', color: '#ef4444' },
]

function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtLive(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TaskDetail({ task, board, columns, labels: boardLabels, onClose, onUpdate, onLabelsChange }) {
  const [detail, setDetail]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleVal, setTitleVal]   = useState(task.title)
  const [allUsers, setAllUsers]   = useState([])
  const [comment, setComment]     = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [subtitleNew, setSubtitleNew] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [manualEntry, setManualEntry] = useState({ description: '', minutes: '' })
  const [showManual, setShowManual] = useState(false)
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [newLabelForm, setNewLabelForm] = useState({ name: '', color: '#00d4ff' })
  const [showNewLabel, setShowNewLabel] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const fileRef = useRef()
  const timerRef = useRef()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/tf/tasks/${task.id}`)
      setDetail(data)
      setTitleVal(data.title)
      // Start live timer if running
      const running = data.time_entries?.find(e => e.is_running)
      if (running) {
        const elapsed = Math.floor((Date.now() - new Date(running.started_at).getTime()) / 1000)
        setTimerSeconds(elapsed)
      }
    } finally { setLoading(false) }
  }, [task.id])

  useEffect(() => { load() }, [load])

  // Live timer tick
  useEffect(() => {
    const running = detail?.time_entries?.find(e => e.is_running)
    if (running) {
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
      setTimerSeconds(0)
    }
    return () => clearInterval(timerRef.current)
  }, [detail?.time_entries])

  const save = async (fields) => {
    await api.put(`/tf/tasks/${task.id}`, fields)
    const updated = { ...detail, ...fields }
    setDetail(updated)
    onUpdate(updated)
  }

  const saveTitle = async () => {
    setTitleEdit(false)
    if (titleVal.trim() && titleVal !== detail?.title) await save({ title: titleVal.trim() })
  }

  const deleteTask = async () => {
    if (!confirm('Excluir esta tarefa?')) return
    await api.delete(`/tf/tasks/${task.id}`)
    onUpdate(null)
  }

  // ─── Timer ─────────────────────────────────────────────────────────────────
  const running = detail?.time_entries?.find(e => e.is_running)

  const startTimer = async () => {
    const { data } = await api.post(`/tf/tasks/${task.id}/timer/start`)
    setTimerSeconds(0)
    setDetail(prev => ({ ...prev, time_entries: [...(prev.time_entries || []).filter(e => !e.is_running), data] }))
  }

  const stopTimer = async () => {
    const { data } = await api.post(`/tf/tasks/${task.id}/timer/stop`)
    setDetail(prev => ({
      ...prev,
      time_entries: prev.time_entries.map(e => e.is_running ? data : e),
    }))
    setTimerSeconds(0)
  }

  const logManual = async e => {
    e.preventDefault()
    if (!manualEntry.minutes) return
    const { data } = await api.post(`/tf/tasks/${task.id}/time`, { ...manualEntry, minutes: parseInt(manualEntry.minutes) })
    setDetail(prev => ({ ...prev, time_entries: [...(prev.time_entries || []), data] }))
    setManualEntry({ description: '', minutes: '' })
    setShowManual(false)
  }

  const deleteTimeEntry = async (entryId) => {
    await api.delete(`/tf/time/${entryId}`)
    setDetail(prev => ({ ...prev, time_entries: prev.time_entries.filter(e => e.id !== entryId) }))
  }

  // ─── Assignees ────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    if (allUsers.length) return
    const { data } = await api.get('/users')
    setAllUsers(data)
  }

  const toggleAssignee = async (userId) => {
    const isAssigned = detail.assignees?.some(a => a.id === userId)
    if (isAssigned) {
      await api.delete(`/tf/tasks/${task.id}/assignees/${userId}`)
      setDetail(prev => ({ ...prev, assignees: prev.assignees.filter(a => a.id !== userId) }))
    } else {
      await api.post(`/tf/tasks/${task.id}/assignees/${userId}`)
      const user = allUsers.find(u => u.id === userId)
      setDetail(prev => ({ ...prev, assignees: [...(prev.assignees || []), user] }))
    }
  }

  // ─── Labels ────────────────────────────────────────────────────────────────
  const toggleLabel = async (labelId) => {
    const has = detail.labels?.some(l => l.id === labelId)
    if (has) {
      await api.delete(`/tf/tasks/${task.id}/labels/${labelId}`)
      setDetail(prev => ({ ...prev, labels: prev.labels.filter(l => l.id !== labelId) }))
    } else {
      await api.post(`/tf/tasks/${task.id}/labels/${labelId}`)
      const lbl = boardLabels.find(l => l.id === labelId)
      setDetail(prev => ({ ...prev, labels: [...(prev.labels || []), lbl] }))
    }
  }

  const createLabel = async e => {
    e.preventDefault()
    const { data } = await api.post(`/tf/boards/${board.id}/labels`, newLabelForm)
    onLabelsChange(prev => [...prev, data])
    setShowNewLabel(false)
    setNewLabelForm({ name: '', color: '#00d4ff' })
  }

  const deleteLabel = async (labelId) => {
    await api.delete(`/tf/labels/${labelId}`)
    onLabelsChange(prev => prev.filter(l => l.id !== labelId))
    setDetail(prev => ({ ...prev, labels: prev.labels.filter(l => l.id !== labelId) }))
  }

  // ─── Comments ──────────────────────────────────────────────────────────────
  const sendComment = async e => {
    e.preventDefault()
    if (!comment.trim()) return
    const { data } = await api.post(`/tf/tasks/${task.id}/comments`, { content: comment, is_internal: commentInternal })
    setDetail(prev => ({ ...prev, comments: [...(prev.comments || []), data] }))
    setComment('')
  }

  const deleteComment = async (cid) => {
    await api.delete(`/tf/comments/${cid}`)
    setDetail(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== cid) }))
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────────
  const addSubtask = async e => {
    e.preventDefault()
    if (!subtitleNew.trim()) return
    const { data } = await api.post('/tf/tasks', {
      board_id: board.id,
      column_id: detail.column_id,
      parent_id: task.id,
      title: subtitleNew.trim(),
    })
    setDetail(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), { ...data, assignees: [], labels: [] }] }))
    setSubtitleNew('')
  }

  const toggleSubtask = async (sub) => {
    // Move to done column or back
    const doneCol = columns.find(c => c.is_done)
    const origCol = columns.find(c => !c.is_done)
    if (!doneCol) return
    const newColId = sub.column_is_done ? (origCol?.id || detail.column_id) : doneCol.id
    await api.patch(`/tf/tasks/${sub.id}/move`, { column_id: newColId, position: sub.position })
    setDetail(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === sub.id ? { ...s, column_is_done: !sub.column_is_done, column_id: newColId } : s),
    }))
  }

  const deleteSubtask = async (subId) => {
    await api.delete(`/tf/tasks/${subId}`)
    setDetail(prev => ({ ...prev, subtasks: prev.subtasks.filter(s => s.id !== subId) }))
  }

  // ─── Attachments ───────────────────────────────────────────────────────────
  const uploadFile = async (file) => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post(`/tf/tasks/${task.id}/attachments`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    setDetail(prev => ({ ...prev, attachments: [...(prev.attachments || []), data] }))
  }

  const deleteAttachment = async (attId) => {
    await api.delete(`/tf/attachments/${attId}`)
    setDetail(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attId) }))
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const prioOpt = PRIORITY_OPTS.find(p => p.value === detail?.priority) || PRIORITY_OPTS[0]
  const totalTime = (detail?.time_entries || []).filter(e => !e.is_running).reduce((s, e) => s + (e.duration_minutes || 0), 0)

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
        background: '#161b27', borderLeft: '1px solid #1e293b',
        display: 'flex', flexDirection: 'column', zIndex: 901,
        overflowY: 'auto',
      }}>
        {loading ? (
          <div style={{ padding: 32, color: '#64748b' }}>Carregando...</div>
        ) : !detail ? null : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, background: '#161b27', zIndex: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                {titleEdit ? (
                  <input autoFocus value={titleVal} onChange={e => setTitleVal(e.target.value)}
                    onBlur={saveTitle} onKeyDown={e => e.key === 'Enter' && saveTitle()}
                    style={{ ...inp, flex: 1, fontSize: 17, fontWeight: 700, background: '#0f1117' }} />
                ) : (
                  <h2 onClick={() => setTitleEdit(true)} style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', flex: 1, cursor: 'text', lineHeight: 1.4 }}>
                    {detail.title}
                  </h2>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={deleteTask} style={{ ...iconBtn, color: '#f87171' }} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={onClose} style={iconBtn}><X size={18} /></button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Status + Priority + Due date */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={lb}><ChevronRight size={12} /> Status</label>
                  <select style={inp} value={detail.column_id}
                    onChange={e => save({ column_id: parseInt(e.target.value) })}>
                    {columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={lb}><Flag size={12} /> Prioridade</label>
                  <select style={{ ...inp, color: prioOpt.color }}
                    value={detail.priority} onChange={e => save({ priority: e.target.value })}>
                    {PRIORITY_OPTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 130 }}>
                  <label style={lb}><Calendar size={12} /> Prazo</label>
                  <input type="date" style={inp} value={detail.due_date?.slice(0, 10) || ''}
                    onChange={e => save({ due_date: e.target.value || null })} />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <label style={lb}><Users size={12} /> Responsáveis</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {detail.assignees?.map(a => (
                    <div key={a.id} title={a.name || a.email} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1e293b', borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#e2e8f0' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#93c5fd' }}>
                        {(a.name || a.email).charAt(0).toUpperCase()}
                      </div>
                      {a.name || a.email}
                      <button onClick={() => toggleAssignee(a.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <button onClick={() => { setShowAssigneePicker(p => !p); loadUsers() }}
                    style={{ ...iconBtn, border: '1px dashed #334155', borderRadius: 20, padding: '4px 10px', fontSize: 12, color: '#64748b' }}>
                    <Plus size={12} /> Adicionar
                  </button>
                </div>
                {showAssigneePicker && (
                  <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, marginTop: 8, maxHeight: 160, overflowY: 'auto' }}>
                    {allUsers.map(u => {
                      const has = detail.assignees?.some(a => a.id === u.id)
                      return (
                        <div key={u.id} onClick={() => toggleAssignee(u.id)}
                          style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: has ? '#00d4ff' : '#e2e8f0', background: has ? '#00d4ff11' : 'transparent' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#93c5fd' }}>
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          {u.name || u.email}
                          {has && <span style={{ marginLeft: 'auto' }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Labels */}
              <div>
                <label style={lb}><Tag size={12} /> Labels</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {detail.labels?.map(l => (
                    <span key={l.id} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: l.color + '33', color: l.color, fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => toggleLabel(l.id)}>
                      {l.name} ×
                    </span>
                  ))}
                  <button onClick={() => setShowLabelPicker(p => !p)}
                    style={{ ...iconBtn, border: '1px dashed #334155', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: '#64748b' }}>
                    <Plus size={12} /> Label
                  </button>
                </div>
                {showLabelPicker && (
                  <div style={{ background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, marginTop: 8, padding: 8 }}>
                    {boardLabels.map(l => {
                      const has = detail.labels?.some(dl => dl.id === l.id)
                      return (
                        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 4px', cursor: 'pointer' }}
                          onClick={() => toggleLabel(l.id)}>
                          <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: has ? '#00d4ff' : '#e2e8f0' }}>{l.name}</span>
                          {has && <span style={{ color: '#00d4ff', fontSize: 12 }}>✓</span>}
                          <button onClick={e => { e.stopPropagation(); deleteLabel(l.id) }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                    {showNewLabel ? (
                      <form onSubmit={createLabel} style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                        <input type="color" value={newLabelForm.color} onChange={e => setNewLabelForm(f => ({ ...f, color: e.target.value }))}
                          style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <input style={{ ...inp, flex: 1 }} placeholder="Nome" value={newLabelForm.name}
                          onChange={e => setNewLabelForm(f => ({ ...f, name: e.target.value }))} required />
                        <button type="submit" style={{ ...btnSm, background: '#00d4ff', color: '#0f1117' }}>OK</button>
                      </form>
                    ) : (
                      <button onClick={() => setShowNewLabel(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, padding: '6px 0', marginTop: 4 }}>
                        <Plus size={12} /> Nova label
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label style={lb}>Descrição</label>
                <textarea rows={3} style={{ ...inp, resize: 'vertical', width: '100%' }}
                  placeholder="Adicionar descrição..."
                  defaultValue={detail.description || ''}
                  onBlur={e => { if (e.target.value !== (detail.description || '')) save({ description: e.target.value }) }} />
              </div>

              {/* Time Tracking */}
              <div>
                <label style={lb}><Clock size={12} /> Time Tracking</label>
                <div style={{ background: '#0f1117', borderRadius: 10, border: '1px solid #1e293b', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    {running ? (
                      <>
                        <div style={{ fontFamily: 'monospace', fontSize: 22, color: '#00d4ff', fontWeight: 700, letterSpacing: 2 }}>
                          {fmtLive(timerSeconds)}
                        </div>
                        <button onClick={stopTimer} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ef444433', border: '1px solid #ef4444', borderRadius: 8, color: '#f87171', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                          <Square size={14} /> Parar
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ color: '#64748b', fontSize: 14 }}>Total: <strong style={{ color: '#e2e8f0' }}>{fmtDuration(totalTime)}</strong></div>
                        <button onClick={startTimer} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00d4ff22', border: '1px solid #00d4ff55', borderRadius: 8, color: '#00d4ff', cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                          <Play size={14} /> Iniciar
                        </button>
                        <button onClick={() => setShowManual(p => !p)} style={{ ...iconBtn, border: '1px solid #1e293b', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#64748b' }}>
                          + Manual
                        </button>
                      </>
                    )}
                  </div>

                  {showManual && (
                    <form onSubmit={logManual} style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <input style={{ ...inp, flex: 1, minWidth: 120 }} placeholder="Descrição" value={manualEntry.description}
                        onChange={e => setManualEntry(f => ({ ...f, description: e.target.value }))} />
                      <input type="number" style={{ ...inp, width: 90 }} placeholder="Minutos" min={1} value={manualEntry.minutes}
                        onChange={e => setManualEntry(f => ({ ...f, minutes: e.target.value }))} required />
                      <button type="submit" style={{ ...btnSm, background: '#00d4ff', color: '#0f1117' }}>OK</button>
                    </form>
                  )}

                  {detail.time_entries?.filter(e => !e.is_running).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {detail.time_entries.filter(e => !e.is_running).map(e => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                          <span style={{ color: '#00d4ff', fontWeight: 600 }}>{fmtDuration(e.duration_minutes || 0)}</span>
                          <span style={{ flex: 1 }}>{e.description || 'Sem descrição'}</span>
                          <span>{e.user_name || ''}</span>
                          <button onClick={() => deleteTimeEntry(e.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <label style={lb}><CheckSquare size={12} /> Subtarefas ({detail.subtasks?.filter(s => !s.deleted_at).length || 0})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detail.subtasks?.filter(s => !s.deleted_at).map(sub => (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f1117', borderRadius: 6, padding: '7px 10px' }}>
                      <input type="checkbox" checked={!!sub.column_is_done} onChange={() => toggleSubtask(sub)}
                        style={{ accentColor: '#00d4ff', cursor: 'pointer' }} />
                      <span style={{ flex: 1, fontSize: 13, color: sub.column_is_done ? '#475569' : '#e2e8f0', textDecoration: sub.column_is_done ? 'line-through' : 'none' }}>
                        {sub.title}
                      </span>
                      <button onClick={() => deleteSubtask(sub.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addSubtask} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Nova subtarefa..." value={subtitleNew}
                    onChange={e => setSubtitleNew(e.target.value)} />
                  <button type="submit" style={{ ...btnSm, background: '#1e293b' }}><Plus size={14} /></button>
                </form>
              </div>

              {/* Attachments */}
              <div>
                <label style={lb}><Paperclip size={12} /> Anexos ({detail.attachments?.length || 0})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {detail.attachments?.map(att => {
                    const isImg = att.mime_type?.startsWith('image/')
                    return (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f1117', borderRadius: 8, padding: '8px 12px' }}>
                        {isImg && <img src={att.file_url} alt={att.filename} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</p>
                          {att.file_size && <p style={{ fontSize: 11, color: '#64748b' }}>{(att.file_size / 1024).toFixed(1)} KB</p>}
                        </div>
                        <a href={att.file_url} download={att.filename} style={{ color: '#64748b', display: 'flex' }} title="Download">
                          <Download size={15} />
                        </a>
                        <button onClick={() => deleteAttachment(att.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
                  onChange={e => { Array.from(e.target.files).forEach(uploadFile); e.target.value = '' }} />
                <button onClick={() => fileRef.current.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px dashed #334155', borderRadius: 8, color: '#64748b', cursor: 'pointer', padding: '8px 14px', fontSize: 13, marginTop: 8 }}>
                  <Paperclip size={14} /> Anexar arquivo
                </button>
              </div>

              {/* Comments */}
              <div>
                <label style={lb}><MessageSquare size={12} /> Comentários ({detail.comments?.length || 0})</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                  {detail.comments?.map(c => (
                    <div key={c.id} style={{ background: c.is_internal ? '#1a1500' : '#0f1117', border: `1px solid ${c.is_internal ? '#eab30833' : '#1e293b'}`, borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{c.user_name || 'Usuário'}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {c.is_internal && <span style={{ fontSize: 10, color: '#eab308', background: '#eab30822', padding: '1px 6px', borderRadius: 4 }}>Interno</span>}
                          <span style={{ fontSize: 11, color: '#475569' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
                          <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0 }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.content}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendComment}>
                  <textarea rows={3} style={{ ...inp, width: '100%', resize: 'none', marginBottom: 8 }}
                    placeholder="Adicionar comentário..." value={comment}
                    onChange={e => setComment(e.target.value)} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                      <input type="checkbox" checked={commentInternal} onChange={e => setCommentInternal(e.target.checked)}
                        style={{ accentColor: '#eab308' }} />
                      Nota interna
                    </label>
                    <button type="submit" style={{ ...btnSm, background: '#00d4ff', color: '#0f1117', fontWeight: 700 }}>
                      Comentar
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </>
        )}
      </div>
    </>
  )
}

const lb     = { fontSize: 12, color: '#64748b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }
const inp    = { padding: '8px 12px', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }
const iconBtn = { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }
const btnSm  = { background: '#1e293b', border: 'none', color: '#e2e8f0', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }

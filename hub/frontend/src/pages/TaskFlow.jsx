import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Plus, LayoutGrid, Trash2, X, CheckSquare } from 'lucide-react'

export default function TaskFlow() {
  const navigate = useNavigate()
  const [boards, setBoards] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', project_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/tf/boards'),
      api.get('/projects'),
    ]).then(([b, p]) => {
      setBoards(b.data)
      setProjects(p.data)
    }).finally(() => setLoading(false))
  }, [])

  const createBoard = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.post('/tf/boards', form)
      setBoards(prev => [data, ...prev])
      setShowModal(false)
      setForm({ name: '', description: '', project_id: '' })
      navigate(`/taskflow/${data.id}`)
    } catch { } finally { setSaving(false) }
  }

  const deleteBoard = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Excluir este board? Todas as tarefas serão apagadas.')) return
    await api.delete(`/tf/boards/${id}`)
    setBoards(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return <div style={{ color: '#64748b' }}>Carregando...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckSquare size={24} color="#00d4ff" /> TaskFlow
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Gerencie tarefas com Kanban, subtarefas e time tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>
          <Plus size={16} /> Novo Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
          <LayoutGrid size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhum board criado</p>
          <p style={{ fontSize: 14 }}>Crie seu primeiro board para começar a organizar tarefas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {boards.map(board => (
            <div key={board.id} onClick={() => navigate(`/taskflow/${board.id}`)}
              style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'border-color .2s', position: 'relative' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#00d4ff55'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>{board.name}</h3>
                  {board.description && (
                    <p style={{ fontSize: 13, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.description}</p>
                  )}
                </div>
                <button onClick={e => deleteBoard(e, board.id)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                  <Trash2 size={15} />
                </button>
              </div>
              {board.project_name && (
                <span style={{ display: 'inline-block', marginTop: 12, fontSize: 11, color: '#00d4ff', background: '#00d4ff15', padding: '2px 8px', borderRadius: 20 }}>
                  {board.project_name}
                </span>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, color: '#64748b', fontSize: 12 }}>
                <span>{board.task_count || 0} tarefas</span>
                <span>{board.done_count || 0} concluídas</span>
              </div>
              {(board.task_count > 0) && (
                <div style={{ marginTop: 8, background: '#0f1117', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#00d4ff', width: `${Math.round((board.done_count / board.task_count) * 100)}%`, transition: 'width .3s' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={overlay} onClick={() => setShowModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Novo Board</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={createBoard} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lb}>Nome *</label>
                <input style={inp} placeholder="Ex: Sprint 1, Feature X..." value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              <div>
                <label style={lb}>Descrição</label>
                <input style={inp} placeholder="Opcional" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={lb}>Projeto vinculado</label>
                <select style={inp} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                  <option value="">Nenhum</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, marginTop: 4 }}>
                {saving ? 'Criando...' : 'Criar Board'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const btnPrimary = { display: 'flex', alignItems: 'center', gap: 8, background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '10px 16px', fontSize: 14 }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modal = { background: '#161b27', border: '1px solid #1e293b', borderRadius: 14, padding: 28, width: '100%', maxWidth: 460 }
const lb = { fontSize: 13, color: '#94a3b8', marginBottom: 6, display: 'block' }
const inp = { width: '100%', padding: '10px 14px', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }

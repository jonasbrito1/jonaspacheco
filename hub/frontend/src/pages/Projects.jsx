import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'

const STATUS = { em_desenvolvimento: { label: 'Em Dev', color: '#00d4ff' }, concluido: { label: 'Concluído', color: '#10b981' }, pausado: { label: 'Pausado', color: '#f59e0b' }, manutencao: { label: 'Manutenção', color: '#a78bfa' } }

const empty = { name: '', client: '', status: 'em_desenvolvimento', technologies: '', description: '', deadline: '', monthly_value: '', url: '' }

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)

  const load = () => api.get('/projects').then(r => setProjects(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit = p => { setForm({ ...p, technologies: p.technologies?.join(', ') || '' }); setEditing(p.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, technologies: form.technologies.split(',').map(t => t.trim()).filter(Boolean) }
    editing ? await api.put(`/projects/${editing}`, payload) : await api.post('/projects', payload)
    setModal(false); load()
  }

  const remove = async id => { if (confirm('Excluir projeto?')) { await api.delete(`/projects/${id}`); load() } }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Projetos</h2>
        <button onClick={openNew} style={s.btnPrimary}><Plus size={16} /> Novo Projeto</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {projects.map(p => (
          <div key={p.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</h3>
                <p style={{ color: '#64748b', fontSize: 13 }}>{p.client || 'Sem cliente'}</p>
              </div>
              <span style={{ background: STATUS[p.status]?.color + '22', color: STATUS[p.status]?.color, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                {STATUS[p.status]?.label}
              </span>
            </div>
            {p.description && <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{p.description}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {p.technologies?.map(t => <span key={t} style={s.tag}>{t}</span>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#10b981', fontWeight: 600 }}>R$ {parseFloat(p.monthly_value || 0).toFixed(2)}/mês</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {p.url && <a href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={16} color="#64748b" /></a>}
                <button onClick={() => openEdit(p)} style={s.iconBtn}><Pencil size={15} /></button>
                <button onClick={() => remove(p.id)} style={{ ...s.iconBtn, color: '#f87171' }}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 20, fontWeight: 700 }}>{editing ? 'Editar' : 'Novo'} Projeto</h3>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={s.input} placeholder="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input style={s.input} placeholder="Cliente" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
              <select style={s.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <input style={s.input} placeholder="Tecnologias (separadas por vírgula)" value={form.technologies} onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))} />
              <textarea style={{ ...s.input, resize: 'vertical', minHeight: 80 }} placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input style={s.input} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              <input style={s.input} type="number" placeholder="Valor mensal (R$)" value={form.monthly_value} onChange={e => setForm(f => ({ ...f, monthly_value: e.target.value }))} />
              <input style={s.input} placeholder="URL do projeto" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" style={s.btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  card: { background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: 20 },
  tag: { background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: 4, fontSize: 12 },
  iconBtn: { background: 'none', border: 'none', color: '#64748b', padding: 4, display: 'flex' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, fontSize: 14 },
  btnSecondary: { flex: 1, padding: '10px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8' },
  input: { padding: '10px 14px', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#161b27', borderRadius: 16, padding: 32, width: 500, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #1e293b' },
}

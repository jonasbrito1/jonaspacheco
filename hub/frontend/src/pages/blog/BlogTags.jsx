import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { slugify } from '../../utils/blog'

const empty = { name: '', slug: '' }

export default function BlogTags() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(false)

  const load = () => api.get('/admin/blog/tags').then(r => setItems(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit = item => { setForm({ name: item.name, slug: item.slug }); setEditing(item.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, slug: form.slug || slugify(form.name) }
    editing ? await api.put(`/admin/blog/tags/${editing}`, payload) : await api.post('/admin/blog/tags', payload)
    setModal(false)
    load()
  }

  const remove = async id => {
    if (!confirm('Excluir tag?')) return
    await api.delete(`/admin/blog/tags/${id}`)
    load()
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <Link to="/blog" style={s.back}><ArrowLeft size={15} /> Voltar para Blog</Link>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Tags</h2>
        </div>
        <button onClick={openNew} style={s.btnPrimary}><Plus size={16} /> Nova tag</button>
      </div>
      <div style={s.grid}>
        {items.map(item => (
          <div key={item.id} style={s.card}>
            <div>
              <p style={{ color: '#EEF2FF', fontWeight: 700 }}>{item.name}</p>
              <p style={{ color: '#4A6B87', fontSize: 12, marginTop: 4 }}>{item.slug}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: '#00d4ff', fontSize: 13 }}>{item.post_count} post(s)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(item)} style={s.iconBtn}><Pencil size={15} /></button>
                <button onClick={() => remove(item.id)} style={{ ...s.iconBtn, color: '#f87171' }}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={s.overlay}>
          <form onSubmit={save} style={s.modal}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{editing ? 'Editar tag' : 'Nova tag'}</h3>
            <input style={s.input} placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug ? f.slug : slugify(e.target.value) }))} required />
            <input style={s.input} placeholder="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
              <button type="submit" style={s.btnPrimary}>Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const s = {
  back: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8BAFC8', textDecoration: 'none', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  card: { background: '#081526', border: '1px solid #1a3a5c', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 18 },
  input: { padding: '11px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#00d4ff', border: 'none', borderRadius: 10, color: '#06101e', fontWeight: 800 },
  btnSecondary: { flex: 1, padding: '10px 14px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(2,12,27,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { width: 'min(480px, 92vw)', display: 'flex', flexDirection: 'column', gap: 12, background: '#081526', border: '1px solid #1a3a5c', borderRadius: 18, padding: 24 },
}

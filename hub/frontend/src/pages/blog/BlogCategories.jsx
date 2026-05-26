import React, { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { slugify } from '../../utils/blog'

const empty = { name: '', slug: '', description: '' }

export default function BlogCategories() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState(false)

  const load = () => api.get('/admin/blog/categories').then(r => setItems(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit = item => { setForm({ name: item.name, slug: item.slug, description: item.description || '' }); setEditing(item.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form, slug: form.slug || slugify(form.name) }
    editing ? await api.put(`/admin/blog/categories/${editing}`, payload) : await api.post('/admin/blog/categories', payload)
    setModal(false)
    load()
  }

  const remove = async id => {
    if (!confirm('Excluir categoria?')) return
    await api.delete(`/admin/blog/categories/${id}`)
    load()
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <Link to="/blog" style={s.back}><ArrowLeft size={15} /> Voltar para Blog</Link>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Categorias</h2>
        </div>
        <button onClick={openNew} style={s.btnPrimary}><Plus size={16} /> Nova categoria</button>
      </div>
      <div style={s.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a3a5c' }}>
              {['Nome', 'Slug', 'Descrição', 'Posts', ''].map(header => <th key={header} style={s.th}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #06101e' }}>
                <td style={s.td}>{item.name}</td>
                <td style={{ ...s.td, color: '#4A6B87' }}>{item.slug}</td>
                <td style={{ ...s.td, color: '#8BAFC8' }}>{item.description || '—'}</td>
                <td style={{ ...s.td, color: '#00d4ff' }}>{item.post_count}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(item)} style={s.iconBtn}><Pencil size={15} /></button>
                    <button onClick={() => remove(item.id)} style={{ ...s.iconBtn, color: '#f87171' }}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={s.overlay}>
          <form onSubmit={save} style={s.modal}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{editing ? 'Editar categoria' : 'Nova categoria'}</h3>
            <input style={s.input} placeholder="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: f.slug ? f.slug : slugify(e.target.value) }))} required />
            <input style={s.input} placeholder="Slug" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))} />
            <textarea style={{ ...s.input, minHeight: 100 }} placeholder="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
  card: { background: '#081526', border: '1px solid #1a3a5c', borderRadius: 18, overflow: 'hidden' },
  th: { padding: '14px 16px', textAlign: 'left', color: '#4A6B87', fontSize: 12, textTransform: 'uppercase' },
  td: { padding: '14px 16px', color: '#EEF2FF', fontSize: 14 },
  input: { padding: '11px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#00d4ff', border: 'none', borderRadius: 10, color: '#06101e', fontWeight: 800 },
  btnSecondary: { flex: 1, padding: '10px 14px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(2,12,27,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { width: 'min(520px, 92vw)', display: 'flex', flexDirection: 'column', gap: 12, background: '#081526', border: '1px solid #1a3a5c', borderRadius: 18, padding: 24 },
}

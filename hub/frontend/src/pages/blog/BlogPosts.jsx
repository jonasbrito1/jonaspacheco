import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Pencil, Eye, Archive, Trash2, Send, FileClock } from 'lucide-react'
import api from '../../services/api'
import { formatDateTime, renderMarkdown } from '../../utils/blog'
import Pagination from '../../components/Pagination'

const STATUS = {
  draft: { label: 'Rascunho', color: '#94a3b8' },
  published: { label: 'Publicado', color: '#00ff88' },
  scheduled: { label: 'Agendado', color: '#ffd600' },
  archived: { label: 'Arquivado', color: '#f97316' },
}

export default function BlogPosts() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [filters, setFilters] = useState({ status: 'all', category: 'all', q: '', page: 1, limit: 10 })
  const [pagination, setPagination] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextFilters = filters) => {
    setLoading(true)
    setError('')
    try {
      const [postsRes, categoriesRes] = await Promise.all([
        api.get('/admin/blog/posts', { params: nextFilters }),
        api.get('/admin/blog/categories'),
      ])
      setPosts(postsRes.data.items || [])
      setPagination(postsRes.data.pagination || null)
      setCategories(categoriesRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar posts do blog.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters.page, filters.status, filters.category, filters.limit])

  const onSearch = e => {
    e.preventDefault()
    const nextFilters = { ...filters, page: 1 }
    setFilters(nextFilters)
    load(nextFilters)
  }

  const patchStatus = async (id, status) => {
    const body = { status }
    if (status === 'scheduled') body.scheduled_at = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await api.patch(`/admin/blog/posts/${id}/status`, body)
    load()
  }

  const remove = async id => {
    if (!confirm('Excluir este post?')) return
    await api.delete(`/admin/blog/posts/${id}`)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#EEF2FF' }}>Blog</h2>
          <p style={{ color: '#4A6B87', fontSize: 13, marginTop: 4 }}>Gerencie publicações, rascunhos, SEO e mídia do blog.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/blog/categories" style={s.btnSecondary}>Categorias</Link>
          <Link to="/blog/tags" style={s.btnSecondary}>Tags</Link>
          <button onClick={() => navigate('/blog/new')} style={s.btnPrimary}><Plus size={16} /> Novo Post</button>
        </div>
      </div>

      <form onSubmit={onSearch} style={s.filterCard}>
        <input
          style={{ ...s.input, flex: 1, minWidth: 220 }}
          placeholder="Buscar por título, resumo, conteúdo ou tag..."
          value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
        />
        <select style={s.input} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="all">Todos os status</option>
          {Object.entries(STATUS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
        </select>
        <select style={s.input} value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value, page: 1 }))}>
          <option value="all">Todas as categorias</option>
          {categories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
        <select style={s.input} value={filters.limit} onChange={e => setFilters(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}>
          {[10, 20, 30].map(size => <option key={size} value={size}>{size} por pagina</option>)}
        </select>
        <button type="submit" style={s.btnPrimary}>Filtrar</button>
      </form>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={s.tableWrap}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a3a5c' }}>
              {['Título', 'Status', 'Categoria', 'Autor', 'Data', 'Ações'].map(header => (
                <th key={header} style={s.th}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={s.empty}>Carregando posts...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan="6" style={s.empty}>Nenhum post encontrado.</td></tr>
            ) : posts.map(post => (
              <tr key={post.id} style={{ borderBottom: '1px solid #081526' }}>
                <td style={s.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ color: '#EEF2FF', fontWeight: 600 }}>{post.title}</span>
                    <span style={{ color: '#4A6B87', fontSize: 12 }}>{post.slug}</span>
                  </div>
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, background: `${STATUS[post.status]?.color || '#4A6B87'}22`, color: STATUS[post.status]?.color || '#4A6B87' }}>
                    {STATUS[post.status]?.label || post.status}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#8BAFC8' }}>{post.category_name || 'Sem categoria'}</td>
                <td style={{ ...s.td, color: '#8BAFC8' }}>{post.author_name || post.author_email || 'Autor não definido'}</td>
                <td style={{ ...s.td, color: '#4A6B87', fontSize: 12 }}>
                  {formatDateTime(post.published_at || post.scheduled_at || post.created_at)}
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setPreview(post)} style={s.iconBtn} title="Preview"><Eye size={15} /></button>
                    <button onClick={() => navigate(`/blog/${post.id}`)} style={s.iconBtn} title="Editar"><Pencil size={15} /></button>
                    {post.status !== 'published' && <button onClick={() => patchStatus(post.id, 'published')} style={s.iconBtn} title="Publicar"><Send size={15} /></button>}
                    {post.status !== 'draft' && <button onClick={() => patchStatus(post.id, 'draft')} style={s.iconBtn} title="Despublicar"><FileClock size={15} /></button>}
                    {post.status !== 'archived' && <button onClick={() => patchStatus(post.id, 'archived')} style={s.iconBtn} title="Arquivar"><Archive size={15} /></button>}
                    <button onClick={() => remove(post.id)} style={{ ...s.iconBtn, color: '#f87171' }} title="Excluir"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagination={pagination} onPageChange={page => setFilters(f => ({ ...f, page }))} />

      {preview && (
        <div style={s.overlay}>
          <div style={s.previewModal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ color: '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>{preview.category_name || 'Preview'}</p>
                <h3 style={{ fontSize: 26, fontWeight: 800, color: '#EEF2FF' }}>{preview.title}</h3>
              </div>
              <button onClick={() => setPreview(null)} style={s.btnSecondary}>Fechar</button>
            </div>
            {preview.cover_image_url && <img src={preview.cover_image_url} alt="" style={{ width: '100%', borderRadius: 16, maxHeight: 280, objectFit: 'cover', marginBottom: 18 }} />}
            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(preview.content) }} />
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  filterCard: { display: 'flex', gap: 12, flexWrap: 'wrap', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 16, padding: 16 },
  tableWrap: { background: '#081526', border: '1px solid #1a3a5c', borderRadius: 16, overflow: 'hidden' },
  th: { padding: '14px 16px', textAlign: 'left', color: '#4A6B87', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { padding: '16px', fontSize: 14, verticalAlign: 'top' },
  empty: { padding: '28px 16px', color: '#4A6B87', textAlign: 'center' },
  badge: { display: 'inline-flex', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  input: { padding: '10px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14 },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#00d4ff', border: 'none', borderRadius: 10, color: '#06101e', fontWeight: 800, fontSize: 14, textDecoration: 'none' },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8', fontSize: 14, textDecoration: 'none' },
  iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(2,12,27,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  previewModal: { width: 'min(960px, 92vw)', maxHeight: '90vh', overflowY: 'auto', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 20, padding: 28 },
  errorBox: { padding: '12px 16px', background: '#7f1d1d33', border: '1px solid #f8717133', borderRadius: 12, color: '#fca5a5', fontSize: 13 },
}

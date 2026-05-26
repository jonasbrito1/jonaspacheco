import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Save, Send, CalendarClock, Eye } from 'lucide-react'
import api from '../../services/api'
import { normalizePostForm, renderMarkdown, slugify } from '../../utils/blog'
import { formatDateBR, isoToDateInput, normalizeDateInput, parseDateInputToIso } from '../../utils/date'

const BLOG_CANONICAL_BASE = 'https://jonaspacheco.cloud/blog'

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category_id: '',
  author_id: '',
  status: 'draft',
  scheduled_at: '',
  seo_title: '',
  seo_description: '',
  canonical_url: '',
  og_image_url: '',
  tag_ids: [],
}

export default function BlogEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = id !== 'new'
  const [postId, setPostId] = useState(isEditing ? id : null)
  const [form, setForm] = useState(emptyForm)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [authors, setAuthors] = useState([])
  const [coverFile, setCoverFile] = useState(null)
  const [inlineFile, setInlineFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState('idle')
  const [message, setMessage] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const lastSavedSnapshot = useRef(normalizePostForm(emptyForm))
  const didLoadRef = useRef(false)
  const dirty = useMemo(() => normalizePostForm(form) !== lastSavedSnapshot.current || !!coverFile, [form, coverFile])
  const effectiveSlug = form.slug || slugify(form.title)
  const effectiveCanonicalUrl = form.canonical_url.trim() || buildCanonicalUrl(effectiveSlug)
  const effectiveOgImageUrl = form.og_image_url.trim() || form.cover_image_url.trim() || ''

  useEffect(() => {
    const load = async () => {
      const [categoriesRes, tagsRes, usersRes] = await Promise.all([
        api.get('/admin/blog/categories'),
        api.get('/admin/blog/tags'),
        api.get('/users'),
      ])
      setCategories(categoriesRes.data)
      setTags(tagsRes.data)
      setAuthors(usersRes.data.filter(user => ['admin', 'dev'].includes(user.role)))

      if (isEditing) {
        const { data } = await api.get(`/admin/blog/posts/${id}`)
        const nextForm = {
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          cover_image_url: data.cover_image_url || '',
          category_id: data.category_id || '',
          author_id: data.author_id || '',
          status: data.status || 'draft',
          scheduled_at: data.scheduled_at ? isoToDateInput(data.scheduled_at) : '',
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
          canonical_url: data.canonical_url || '',
          og_image_url: data.og_image_url || '',
          tag_ids: (data.tags || []).map(tag => tag.id),
        }
        setForm(nextForm)
        setSlugTouched(true)
        setPostId(data.id)
        lastSavedSnapshot.current = normalizePostForm(nextForm)
      }
      didLoadRef.current = true
    }
    load()
  }, [id, isEditing])

  useEffect(() => {
    const handler = event => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  useEffect(() => {
    if (!didLoadRef.current) return undefined
    const interval = setInterval(() => {
      if (!dirty || saving || !form.title.trim() || !form.content.trim()) return
      persist(undefined, { silent: true, source: 'autosave' })
    }, 30000)
    return () => clearInterval(interval)
  }, [dirty, saving, form, postId])

  const renderedPreview = useMemo(() => renderMarkdown(form.content), [form.content])

  const setField = (key, value) => {
    setForm(current => ({ ...current, [key]: value }))
    if (saveState === 'autosaved') setSaveState('idle')
  }

  const onTitleChange = value => {
    setForm(current => ({ ...current, title: value, slug: slugTouched ? current.slug : slugify(value) }))
    if (saveState === 'autosaved') setSaveState('idle')
  }

  const uploadFile = async file => {
    const fd = new FormData()
    fd.append('file', file)
    const { data } = await api.post('/admin/blog/media/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const uploadCover = async () => {
    if (!coverFile) return
    try {
      setMessage('')
      const data = await uploadFile(coverFile)
      setField('cover_image_url', data.url)
      setCoverFile(null)
      setMessage(`Imagem enviada com sucesso. Caminho publico: ${data.public_path}`)
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao enviar a imagem de capa.')
    }
  }

  const insertInlineImage = async () => {
    if (!inlineFile) return
    try {
      const data = await uploadFile(inlineFile)
      const markdown = `\n\n![${inlineFile.name}](${data.url})\n\n`
      setField('content', `${form.content}${markdown}`)
      setInlineFile(null)
      setMessage(`Imagem inserida no conteúdo. URL publica: ${data.public_path}`)
    } catch (err) {
      setMessage(err.response?.data?.error || 'Erro ao inserir imagem no conteúdo.')
    }
  }

  const buildPayload = async statusOverride => {
    let nextCover = form.cover_image_url
    if (coverFile) {
      const data = await uploadFile(coverFile)
      nextCover = data.url
      setCoverFile(null)
    }

    const nextSlug = form.slug || slugify(form.title)

    return {
      ...form,
      cover_image_url: nextCover,
      slug: nextSlug,
      status: statusOverride || form.status,
      category_id: form.category_id || null,
      author_id: form.author_id || null,
      canonical_url: form.canonical_url.trim() || buildCanonicalUrl(nextSlug) || null,
      og_image_url: form.og_image_url.trim() || nextCover || null,
      scheduled_at: form.scheduled_at ? parseDateInputToIso(form.scheduled_at) : null,
    }
  }

  const persist = async (statusOverride, { silent = false, source = 'manual' } = {}) => {
    if (saving) return null
    setSaving(true)
    setSaveState(source === 'autosave' ? 'saving' : 'manual-saving')
    if (!silent) setMessage('')

    try {
      const payload = await buildPayload(statusOverride)
      const response = postId
        ? await api.put(`/admin/blog/posts/${postId}`, payload)
        : await api.post('/admin/blog/posts', { ...payload, status: statusOverride || payload.status || 'draft' })

      const savedForm = {
        title: response.data.title || '',
        slug: response.data.slug || '',
        excerpt: response.data.excerpt || '',
        content: response.data.content || '',
        cover_image_url: response.data.cover_image_url || '',
        category_id: response.data.category_id || '',
        author_id: response.data.author_id || '',
        status: response.data.status || 'draft',
        scheduled_at: response.data.scheduled_at ? isoToDateInput(response.data.scheduled_at) : '',
        seo_title: response.data.seo_title || '',
        seo_description: response.data.seo_description || '',
        canonical_url: response.data.canonical_url || '',
        og_image_url: response.data.og_image_url || '',
        tag_ids: (response.data.tags || []).map(tag => tag.id),
      }

      setForm(savedForm)
      setPostId(response.data.id)
      lastSavedSnapshot.current = normalizePostForm(savedForm)
      setSaveState(source === 'autosave' ? 'autosaved' : 'saved')
      if (!silent) setMessage(source === 'autosave' ? 'Salvo automaticamente.' : 'Post salvo com sucesso.')
      if (!isEditing && !postId) navigate(`/blog/${response.data.id}`, { replace: true })
      return response.data
    } catch (err) {
      setSaveState('error')
      setMessage(err.response?.data?.error || 'Erro ao salvar post.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const navigateBack = () => {
    if (dirty && !window.confirm('Há alterações não salvas. Deseja sair mesmo assim?')) return
    navigate('/blog')
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <button onClick={navigateBack} style={s.backBtn}><ArrowLeft size={15} /> Voltar</button>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 10, color: '#EEF2FF' }}>{postId ? 'Editar Post' : 'Novo Post'}</h2>
          <p style={{ color: '#4A6B87', fontSize: 13, marginTop: 4 }}>
            Preview em tempo real com auto-save de rascunho a cada 30s e proteção contra perda de conteúdo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={s.statusPill(saveState)}>
            {saveState === 'saving' && 'Salvando...'}
            {saveState === 'autosaved' && 'Salvo automaticamente'}
            {saveState === 'saved' && 'Salvo'}
            {saveState === 'error' && 'Erro ao salvar'}
            {saveState === 'idle' && (dirty ? 'Alterações pendentes' : 'Sem alterações')}
            {saveState === 'manual-saving' && 'Salvando...'}
          </span>
          <button onClick={() => persist('draft', { source: 'manual' })} disabled={saving} style={s.btnSecondary}><Save size={15} /> Salvar rascunho</button>
          <button onClick={() => persist('scheduled', { source: 'manual' })} disabled={saving} style={s.btnWarning}><CalendarClock size={15} /> Agendar</button>
          <button onClick={() => persist('published', { source: 'manual' })} disabled={saving} style={s.btnPrimary}><Send size={15} /> Publicar</button>
        </div>
      </div>

      {message && <div style={saveState === 'error' ? s.errorMessage : s.message}>{message}</div>}

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(340px, 0.9fr)', gap: 18 }}>
        <div style={s.card}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Título</label>
            <input style={s.input} value={form.title} onChange={e => onTitleChange(e.target.value)} placeholder="Ex.: Segurança desde o primeiro deploy" />
          </div>

          <div className="resp-grid-2" style={s.grid2}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Slug</label>
              <input style={s.input} value={form.slug} onChange={e => { setSlugTouched(true); setField('slug', slugify(e.target.value)) }} placeholder="slug-do-post" />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Status</label>
              <select style={s.input} value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="scheduled">Agendado</option>
                <option value="archived">Arquivado</option>
              </select>
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Resumo</label>
            <textarea style={{ ...s.input, minHeight: 88, resize: 'vertical' }} value={form.excerpt} onChange={e => setField('excerpt', e.target.value)} placeholder="Resumo usado em cards, listagens e SEO." />
          </div>

          <div className="resp-grid-2" style={s.grid2}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Categoria</label>
              <select style={s.input} value={form.category_id} onChange={e => setField('category_id', e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Autor</label>
              <select style={s.input} value={form.author_id} onChange={e => setField('author_id', e.target.value)}>
                <option value="">Autor padrão</option>
                {authors.map(author => <option key={author.id} value={author.id}>{author.name || author.email}</option>)}
              </select>
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Tags</label>
            <div style={s.tagGrid}>
              {tags.map(tag => {
                const active = form.tag_ids.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setField('tag_ids', active ? form.tag_ids.filter(currentId => currentId !== tag.id) : [...form.tag_ids, tag.id])}
                    style={{ ...s.tagButton, ...(active ? s.tagButtonActive : {}) }}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Imagem de capa</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input style={s.input} value={form.cover_image_url} onChange={e => setField('cover_image_url', e.target.value)} placeholder="/uploads/blog/minha-capa.webp" />
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" onChange={e => setCoverFile(e.target.files?.[0] || null)} style={{ color: '#8BAFC8' }} />
              <button type="button" onClick={uploadCover} style={s.btnSecondary}><ImagePlus size={14} /> Enviar capa</button>
            </div>
            {form.cover_image_url && <img src={form.cover_image_url} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 14, marginTop: 12 }} />}
          </div>

          <div style={s.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={s.label}>Conteúdo em Markdown</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" onChange={e => setInlineFile(e.target.files?.[0] || null)} style={{ color: '#8BAFC8' }} />
                <button type="button" onClick={insertInlineImage} style={s.btnSecondary}><ImagePlus size={14} /> Inserir imagem</button>
              </div>
            </div>
            <textarea style={{ ...s.input, minHeight: 360, resize: 'vertical', fontFamily: 'monospace' }} value={form.content} onChange={e => setField('content', e.target.value)} placeholder={'# Titulo\n\nEscreva aqui o conteúdo do artigo...'} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, alignItems: 'center' }}>
              <div>
                <p style={{ color: '#00d4ff', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>SEO e publicação</p>
                <h3 style={{ color: '#EEF2FF', fontSize: 18, fontWeight: 700 }}>Metadados</h3>
              </div>
              <Eye size={18} color="#00d4ff" />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Título SEO</label>
              <input style={s.input} value={form.seo_title} onChange={e => setField('seo_title', e.target.value)} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Descrição SEO</label>
              <textarea style={{ ...s.input, minHeight: 84 }} value={form.seo_description} onChange={e => setField('seo_description', e.target.value)} />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Canonical URL</label>
              <input style={s.input} value={form.canonical_url} onChange={e => setField('canonical_url', e.target.value)} placeholder="https://jonaspacheco.cloud/blog/seu-post" />
              {!form.canonical_url.trim() && effectiveCanonicalUrl && (
                <p style={s.helperText}>Canonical automático: <strong>{effectiveCanonicalUrl}</strong></p>
              )}
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Open Graph Image</label>
              <input style={s.input} value={form.og_image_url} onChange={e => setField('og_image_url', e.target.value)} placeholder={form.cover_image_url || '/uploads/blog/capa.webp'} />
              {!form.og_image_url.trim() && (
                <p style={s.helperText}>
                  {effectiveOgImageUrl
                    ? `Open Graph automático usando a capa: ${effectiveOgImageUrl}`
                    : 'Sem imagem definida. O portal seguirá com fallback seguro.'}
                </p>
              )}
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Agendamento</label>
              <input
                style={s.input}
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="dd/mm/aaaa"
                value={form.scheduled_at}
                onChange={e => setField('scheduled_at', normalizeDateInput(e.target.value))}
              />
            </div>
            <div style={{ color: '#4A6B87', fontSize: 12, lineHeight: 1.6 }}>
              <p>Status atual: <strong style={{ color: '#8BAFC8' }}>{form.status}</strong></p>
              {form.scheduled_at && <p>Agendado para: <strong style={{ color: '#8BAFC8' }}>{formatDateBR(parseDateInputToIso(form.scheduled_at))}</strong></p>}
            </div>
          </div>

          <div style={s.card}>
            <p style={{ color: '#00ff88', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Preview renderizado</p>
            {form.cover_image_url && <img src={form.cover_image_url} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }} />}
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10, color: '#EEF2FF' }}>{form.title || 'Seu título aparece aqui'}</h1>
            {form.excerpt && <p style={{ color: '#8BAFC8', lineHeight: 1.7, marginBottom: 18 }}>{form.excerpt}</p>}
            <div className="blog-prose" dangerouslySetInnerHTML={{ __html: renderedPreview || '<p>O preview do conteúdo aparecerá aqui.</p>' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function buildCanonicalUrl(slug) {
  return slug ? `${BLOG_CANONICAL_BASE}/${slug}` : ''
}

const s = {
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8', padding: '9px 12px' },
  card: { background: '#081526', border: '1px solid #1a3a5c', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  label: { fontSize: 13, color: '#8BAFC8', fontWeight: 600 },
  input: { width: '100%', padding: '11px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14 },
  tagGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  tagButton: { padding: '8px 12px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 999, color: '#8BAFC8', fontSize: 13 },
  tagButtonActive: { background: '#00d4ff22', borderColor: '#00d4ff66', color: '#00d4ff' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#00ff88', border: 'none', borderRadius: 10, color: '#06101e', fontWeight: 800 },
  btnWarning: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: '#ffd600', border: 'none', borderRadius: 10, color: '#06101e', fontWeight: 800 },
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8' },
  message: { padding: '12px 16px', background: '#00d4ff11', border: '1px solid #00d4ff33', borderRadius: 12, color: '#8BD5E5', fontSize: 13 },
  errorMessage: { padding: '12px 16px', background: '#7f1d1d33', border: '1px solid #f8717133', borderRadius: 12, color: '#fca5a5', fontSize: 13 },
  helperText: { color: '#4A6B87', fontSize: 12, lineHeight: 1.5, marginTop: 6 },
  statusPill: saveState => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '9px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    color: saveState === 'error' ? '#fca5a5' : saveState === 'autosaved' ? '#86efac' : '#8BAFC8',
    background: saveState === 'error' ? '#7f1d1d33' : saveState === 'autosaved' ? '#14532d55' : '#06101e',
    border: `1px solid ${saveState === 'error' ? '#f8717133' : saveState === 'autosaved' ? '#22c55e33' : '#1a3a5c'}`,
  }),
}

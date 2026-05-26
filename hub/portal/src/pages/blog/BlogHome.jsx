import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Clock3, ArrowRight } from 'lucide-react'
import blogApi from '../../services/blogApi'
import { buildCanonical, formatDate } from '../../utils/blog'
import { useSeo } from '../../utils/useSeo'
import Pagination from '../../components/Pagination'

export default function BlogHome() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState(null)
  const [search, setSearch] = useState(params.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const page = Number(params.get('page') || 1)
  const selectedCategory = params.get('categoria') || ''
  const query = params.get('q') || ''

  useSeo({
    title: 'Blog | Jonas Pacheco',
    description: 'Artigos sobre fullstack, DevSecOps, arquitetura e construção de produtos digitais.',
    canonical: buildCanonical(`/blog${params.toString() ? `?${params.toString()}` : ''}`),
    type: 'website',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          blogApi.get('/posts', { params: { page, limit: 6, ...(selectedCategory ? { category: selectedCategory } : {}), ...(query ? { q: query } : {}) } }),
          blogApi.get('/categories'),
        ])
        setPosts(postsRes.data.items || [])
        setPagination(postsRes.data.pagination || null)
        setCategories(categoriesRes.data.filter(category => Number(category.post_count) > 0))
      } catch (err) {
        setError(err.response?.data?.error || 'Nao foi possível carregar o feed do blog.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, selectedCategory, query])

  const changePage = nextPage => {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    setParams(next)
  }

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <section style={hero}>
        <p style={{ color: '#00d4ff', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12, fontWeight: 700 }}>Blog jonaspacheco.cloud</p>
        <h1 style={{ fontSize: 42, lineHeight: 1.05, maxWidth: 700, marginTop: 12, marginBottom: 12 }}>
          Conteúdo prático sobre <span style={{ color: '#00ff88' }}>fullstack</span>, produto e DevSecOps.
        </h1>
        <p style={{ color: '#8BAFC8', lineHeight: 1.8, maxWidth: 760, fontSize: 16 }}>
          Bastidores, decisões técnicas e aprendizados reais da construção do ecossistema Jonas Pacheco.
        </p>

        <form
          onSubmit={e => {
            e.preventDefault()
            const next = new URLSearchParams()
            if (search.trim()) next.set('q', search.trim())
            navigate(`/blog/busca?${next.toString()}`)
          }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}
        >
          <div style={searchBox}>
            <Search size={16} color="#4A6B87" />
            <input
              style={searchInput}
              placeholder="Buscar por título, conteúdo ou tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" style={primaryBtn}>Buscar</button>
        </form>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            const next = new URLSearchParams(params)
            next.delete('categoria')
            next.set('page', '1')
            setParams(next)
          }}
          style={{ ...chip, ...(selectedCategory ? {} : chipActive) }}
        >
          Todos
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('categoria', category.slug)
              next.set('page', '1')
              setParams(next)
            }}
            style={{ ...chip, ...(selectedCategory === category.slug ? chipActive : {}) }}
          >
            {category.name}
          </button>
        ))}
      </div>

      {error && <StateBox tone="error">{error}</StateBox>}

      {loading ? (
        <StateBox>Carregando artigos...</StateBox>
      ) : posts.length === 0 ? (
        <StateBox>Nenhum artigo publicado encontrado para esse filtro.</StateBox>
      ) : (
        <>
          <section className="blog-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {posts.map(post => <BlogCard key={post.id} post={post} />)}
          </section>
          <Pagination pagination={pagination} onPageChange={changePage} />
        </>
      )}
    </div>
  )
}

export function BlogCard({ post }) {
  return (
    <article style={card}>
      {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} style={cardImage} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={categoryBadge}>{post.category_name || 'Artigo'}</span>
          <span style={{ color: '#4A6B87', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock3 size={13} /> {post.reading_time_minutes} min</span>
        </div>
        <div>
          <h2 style={{ fontSize: 24, lineHeight: 1.12, marginBottom: 10 }}>{post.title}</h2>
          <p style={{ color: '#8BAFC8', lineHeight: 1.7, fontSize: 14 }}>{post.excerpt}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginTop: 'auto' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <span style={{ color: '#4A6B87', fontSize: 12 }}>{formatDate(post.published_at || post.scheduled_at)}</span>
            <span style={{ color: '#EEF2FF', fontSize: 12 }}>{post.author_name || 'Jonas Pacheco'}</span>
          </div>
          <Link to={`/blog/${post.slug}`} style={linkBtn}>Ler artigo <ArrowRight size={14} /></Link>
        </div>
      </div>
    </article>
  )
}

export function StateBox({ children, tone = 'neutral' }) {
  return (
    <div style={{
      background: tone === 'error' ? '#7f1d1d33' : '#081526',
      border: `1px ${tone === 'error' ? 'solid #f8717133' : 'dashed #1a3a5c'}`,
      borderRadius: 18,
      padding: 24,
      color: tone === 'error' ? '#fca5a5' : '#4A6B87',
      textAlign: 'center',
    }}>
      {children}
    </div>
  )
}

const hero = {
  background: 'radial-gradient(circle at top left, rgba(0,212,255,0.18), transparent 34%), linear-gradient(135deg, #081526 0%, #0d1e35 100%)',
  border: '1px solid #1a3a5c',
  borderRadius: 28,
  padding: '34px 30px',
}
const searchBox = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 280, flex: 1, padding: '12px 14px', borderRadius: 14, background: '#06101e', border: '1px solid #1a3a5c' }
const searchInput = { width: '100%', border: 'none', outline: 'none', background: 'transparent', color: '#EEF2FF', fontSize: 14 }
const primaryBtn = { padding: '12px 18px', background: '#00d4ff', border: 'none', borderRadius: 14, color: '#06101e', fontWeight: 800, fontSize: 14 }
const chip = { padding: '9px 14px', borderRadius: 999, border: '1px solid #1a3a5c', background: '#081526', color: '#8BAFC8', fontSize: 13 }
const chipActive = { borderColor: '#00d4ff66', color: '#00d4ff', background: '#00d4ff12' }
const card = { display: 'flex', flexDirection: 'column', gap: 16, background: 'linear-gradient(180deg, #081526 0%, #0b1730 100%)', border: '1px solid #1a3a5c', borderRadius: 22, overflow: 'hidden', padding: 16, minHeight: '100%' }
const cardImage = { width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 16, border: '1px solid #1a3a5c' }
const categoryBadge = { display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 999, background: '#00ff8822', color: '#00ff88', fontSize: 12, fontWeight: 700 }
const linkBtn = { color: '#00d4ff', fontWeight: 700, textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }

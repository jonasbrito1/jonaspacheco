import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import blogApi from '../../services/blogApi'
import { buildCanonical } from '../../utils/blog'
import { useSeo } from '../../utils/useSeo'
import Pagination from '../../components/Pagination'
import { BlogCard, StateBox } from './BlogHome'

export default function BlogSearch() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const page = Number(params.get('page') || 1)
  const [posts, setPosts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useSeo({
    title: query ? `Busca por "${query}" | Blog Jonas Pacheco` : 'Busca | Blog Jonas Pacheco',
    description: query ? `Resultados de busca do blog para ${query}.` : 'Busca no blog Jonas Pacheco.',
    canonical: buildCanonical(`/blog/busca${params.toString() ? `?${params.toString()}` : ''}`),
    type: 'website',
  })

  useEffect(() => {
    const load = async () => {
      if (!query.trim()) {
        setPosts([])
        setPagination(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const { data } = await blogApi.get('/search', { params: { q: query, page, limit: 6 } })
        setPosts(data.items || [])
        setPagination(data.pagination || null)
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao executar a busca.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [query, page])

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div>
        <Link to="/blog" style={{ color: '#00d4ff', fontSize: 14 }}>← Voltar para o Blog</Link>
        <h1 style={{ fontSize: 34, marginTop: 14 }}>Busca: “{query || '...' }”</h1>
        <p style={{ color: '#8BAFC8', marginTop: 8 }}>{pagination?.total || posts.length} resultado(s) encontrado(s).</p>
      </div>
      {!query.trim() && <StateBox>Informe um termo de busca na URL, por exemplo: <code>?q=devsecops</code>.</StateBox>}
      {error && <StateBox tone="error">{error}</StateBox>}
      {loading ? <StateBox>Buscando artigos...</StateBox> : query.trim() && posts.length === 0 ? <StateBox>Nenhum artigo encontrado para essa busca.</StateBox> : posts.length > 0 ? (
        <>
          <div className="blog-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {posts.map(post => <BlogCard key={post.id} post={post} />)}
          </div>
          <Pagination pagination={pagination} onPageChange={nextPage => setParams({ q: query, page: String(nextPage) })} />
        </>
      ) : null}
    </div>
  )
}

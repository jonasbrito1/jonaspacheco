import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import blogApi from '../../services/blogApi'
import { buildCanonical } from '../../utils/blog'
import { useSeo } from '../../utils/useSeo'
import Pagination from '../../components/Pagination'
import { BlogCard, StateBox } from './BlogHome'

export default function BlogCategory() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const page = Number(params.get('page') || 1)

  useSeo({
    title: `${category?.name || 'Categoria'} | Blog Jonas Pacheco`,
    description: category?.description || `Artigos filtrados por categoria no blog de Jonas Pacheco.`,
    canonical: buildCanonical(`/blog/categoria/${slug}${params.toString() ? `?${params.toString()}` : ''}`),
    type: 'website',
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [postsRes, categoriesRes] = await Promise.all([
          blogApi.get('/posts', { params: { category: slug, page, limit: 6 } }),
          blogApi.get('/categories'),
        ])
        setPosts(postsRes.data.items || [])
        setPagination(postsRes.data.pagination || null)
        setCategory(categoriesRes.data.find(item => item.slug === slug) || null)
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao carregar a categoria.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, page])

  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <div>
        <Link to="/blog" style={{ color: '#00d4ff', fontSize: 14 }}>← Voltar para o Blog</Link>
        <h1 style={{ fontSize: 34, marginTop: 14 }}>{category?.name || 'Categoria'}</h1>
        <p style={{ color: '#8BAFC8', marginTop: 8 }}>{category?.description || 'Artigos publicados nesta categoria.'}</p>
      </div>

      {error && <StateBox tone="error">{error}</StateBox>}
      {loading ? <StateBox>Carregando artigos...</StateBox> : posts.length === 0 ? <StateBox>Nenhum artigo publicado nesta categoria.</StateBox> : (
        <>
          <div className="blog-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {posts.map(post => <BlogCard key={post.id} post={post} />)}
          </div>
          <Pagination pagination={pagination} onPageChange={nextPage => setParams({ page: String(nextPage) })} />
        </>
      )}
    </div>
  )
}

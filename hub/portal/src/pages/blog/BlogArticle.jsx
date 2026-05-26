import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock3 } from 'lucide-react'
import blogApi from '../../services/blogApi'
import { buildCanonical, formatDate, renderMarkdown } from '../../utils/blog'
import { useSeo } from '../../utils/useSeo'
import { BlogCard, StateBox } from './BlogHome'

export default function BlogArticle() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await blogApi.get(`/posts/${slug}`)
        setPost(data)
        setError('')
      } catch (err) {
        setError(err.response?.data?.error || 'Artigo não encontrado.')
      }
    }
    load()
  }, [slug])

  const seoTitle = post?.seo_title || (post ? `${post.title} | Jonas Pacheco` : 'Blog | Jonas Pacheco')
  const seoDescription = post?.seo_description || post?.excerpt || 'Artigo do blog Jonas Pacheco.'
  const canonical = post?.canonical_url || (post ? buildCanonical(`/blog/${post.slug}`) : buildCanonical(`/blog/${slug}`))
  const image = post?.og_image_url || post?.cover_image_url || undefined

  useSeo(post ? {
    title: seoTitle,
    description: seoDescription,
    canonical,
    image,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: seoDescription,
      image,
      mainEntityOfPage: canonical,
      datePublished: post.published_at || post.scheduled_at,
      dateModified: post.updated_at || post.published_at || post.scheduled_at,
      author: { '@type': 'Person', name: post.author_name || 'Jonas Pacheco' },
      publisher: {
        '@type': 'Person',
        name: 'Jonas Pacheco',
      },
    },
  } : {
    title: 'Blog | Jonas Pacheco',
    description: 'Artigos sobre fullstack, DevSecOps e produto.',
    canonical: buildCanonical(`/blog/${slug}`),
    type: 'article',
  })

  if (error) return <StateBox tone="error">{error}</StateBox>
  if (!post) return <StateBox>Carregando artigo...</StateBox>

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', color: '#4A6B87', fontSize: 13 }}>
        <Link to="/blog" style={{ color: '#00d4ff' }}>Blog</Link>
        <span>/</span>
        {post.category_slug ? <Link to={`/blog/categoria/${post.category_slug}`} style={{ color: '#8BAFC8' }}>{post.category_name}</Link> : <span>Artigo</span>}
      </div>

      <article style={articleWrap}>
        <header style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={badge}>{post.category_name || 'Artigo'}</span>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#4A6B87', fontSize: 13 }}>
              <span>{formatDate(post.published_at || post.scheduled_at)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock3 size={14} /> {post.reading_time_minutes} min de leitura</span>
            </div>
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.02, letterSpacing: -1.2 }}>{post.title}</h1>
          <p style={{ color: '#8BAFC8', fontSize: 18, lineHeight: 1.8, maxWidth: 760 }}>{post.excerpt}</p>
          <div style={{ color: '#4A6B87', fontSize: 13 }}>Por <strong style={{ color: '#EEF2FF' }}>{post.author_name || 'Jonas Pacheco'}</strong></div>
          {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} style={heroImage} />}
        </header>

        <div className="portal-blog-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

        {(post.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 30 }}>
            {post.tags.map(tag => (
              <Link key={tag.id} to={`/blog/tag/${tag.slug}`} style={tagChip}>#{tag.name}</Link>
            ))}
          </div>
        )}
      </article>

      {(post.related_posts || []).length > 0 && (
        <section style={{ display: 'grid', gap: 16 }}>
          <div>
            <p style={{ color: '#00ff88', textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.8 }}>Leia a seguir</p>
            <h2 style={{ fontSize: 28, fontWeight: 800 }}>Posts relacionados</h2>
          </div>
          <div className="blog-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
            {post.related_posts.map(item => <BlogCard key={item.id} post={item} />)}
          </div>
        </section>
      )}
    </div>
  )
}

const articleWrap = { maxWidth: 920, margin: '0 auto', width: '100%', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 28, padding: '30px 28px' }
const badge = { display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: '#00d4ff22', color: '#00d4ff', fontSize: 12, fontWeight: 700 }
const heroImage = { width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 20, border: '1px solid #1a3a5c' }
const tagChip = { padding: '8px 12px', borderRadius: 999, background: '#0d1e35', border: '1px solid #1a3a5c', color: '#8BAFC8', fontSize: 13, textDecoration: 'none' }

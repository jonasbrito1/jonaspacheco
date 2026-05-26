import { useEffect } from 'react'

function upsertMeta(selector, attrs) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
}

export function useSeo({ title, description, canonical, image, jsonLd, type = 'website' } = {}) {
  useEffect(() => {
    const previousTitle = document.title
    const previousCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''
    document.title = title || 'Jonas Pacheco'

    upsertMeta('meta[name="description"]', { name: 'description', content: description || 'Conteúdo do blog Jonas Pacheco.' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title || 'Jonas Pacheco' })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description || 'Conteúdo do blog Jonas Pacheco.' })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' })
    if (image) upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })

    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.setAttribute('rel', 'canonical')
      document.head.appendChild(link)
    }
    if (canonical) link.setAttribute('href', canonical)

    let script = null
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => {
      document.title = previousTitle
      if (previousCanonical) link?.setAttribute('href', previousCanonical)
      if (script?.parentNode) script.parentNode.removeChild(script)
    }
  }, [title, description, canonical, image, jsonLd, type])
}

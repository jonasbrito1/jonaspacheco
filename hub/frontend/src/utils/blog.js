import { formatDateBR, formatDateTimeBR } from './date'

export function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function sanitizeUrl(url, { allowRelative = true, allowImage = false } = {}) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (allowRelative && (raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../'))) return escapeHtml(raw)
  if (allowImage && raw.startsWith('data:image/')) return escapeHtml(raw)
  try {
    const parsed = new URL(raw, 'https://example.com')
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return escapeHtml(raw)
    }
  } catch {}
  return ''
}

function formatInline(value) {
  let text = escapeHtml(value)

  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const safeSrc = sanitizeUrl(src, { allowRelative: true, allowImage: true })
    if (!safeSrc) return ''
    return `<img src="${safeSrc}" alt="${escapeHtml(alt)}" loading="lazy" />`
  })
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const safeHref = sanitizeUrl(href, { allowRelative: true })
    if (!safeHref) return label
    const external = /^https?:/i.test(href)
    return `<a href="${safeHref}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`
  })

  return text
}

function renderCodeBlock(block) {
  const lines = block.split('\n')
  const language = lines[0].replace(/^```/, '').trim()
  const content = lines.slice(1, lines[lines.length - 1] === '```' ? -1 : undefined).join('\n')
  const safeLanguage = language ? ` data-language="${escapeHtml(language)}"` : ''
  return `<pre><code${safeLanguage}>${escapeHtml(content)}</code></pre>`
}

export function renderMarkdown(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n')
  const blocks = source.split(/\n{2,}/).map(block => block.trim()).filter(Boolean)

  return blocks.map(block => {
    if (block.startsWith('```')) return renderCodeBlock(block)
    if (block.startsWith('### ')) return `<h3>${formatInline(block.slice(4))}</h3>`
    if (block.startsWith('## ')) return `<h2>${formatInline(block.slice(3))}</h2>`
    if (block.startsWith('# ')) return `<h1>${formatInline(block.slice(2))}</h1>`
    if (/^[-*]\s+/m.test(block)) {
      const items = block.split('\n').map(line => line.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
      return `<ul>${items.map(item => `<li>${formatInline(item)}</li>`).join('')}</ul>`
    }
    if (/^\d+\.\s+/m.test(block)) {
      const items = block.split('\n').map(line => line.replace(/^\d+\.\s+/, '').trim()).filter(Boolean)
      return `<ol>${items.map(item => `<li>${formatInline(item)}</li>`).join('')}</ol>`
    }
    if (block.startsWith('> ')) {
      return `<blockquote>${formatInline(block.replace(/^>\s?/gm, '').replace(/\n/g, '<br/>'))}</blockquote>`
    }
    return `<p>${formatInline(block.replace(/\n/g, '<br/>'))}</p>`
  }).join('')
}

export function formatDateTime(value) {
  return formatDateTimeBR(value)
}

export function formatDate(value) {
  return formatDateBR(value)
}

export function normalizePostForm(form) {
  return JSON.stringify({
    ...form,
    tag_ids: [...(form.tag_ids || [])].sort((a, b) => Number(a) - Number(b)),
  })
}

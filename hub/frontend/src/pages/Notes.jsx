import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pin, PinOff, Trash2, Search, Save, X } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { ago, dateTime } from '../lib/format'
import { PageHead, Loading } from '../components/ui'

const EMPTY = { title: '', content: '', tags: '', pinned: false, project_id: '' }

export default function Notes() {
  const [params, setParams] = useSearchParams()
  const [notes, setNotes] = useState(null)
  const [projects, setProjects] = useState([])
  const [q, setQ] = useState('')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const projectFilter = params.get('projeto') || ''

  const load = () => api.get('/notes').then(({ data }) => { setNotes(data); return data })

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data)).catch(() => {})
    load().then((data) => {
      const id = Number(params.get('id'))
      const open = id && data.find((n) => n.id === id)
      if (open) edit(open)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const edit = (n) => {
    setError('')
    setDraft({ ...n, tags: (n.tags || []).join(', '), project_id: n.project_id || '' })
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (notes || []).filter((n) =>
      (!projectFilter || String(n.project_id) === projectFilter) &&
      (!term || n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term) || (n.tags || []).some((t) => t.includes(term))))
  }, [notes, q, projectFilter])

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const body = { ...draft, project_id: draft.project_id || null }
      const { data } = draft.id ? await api.put(`/notes/${draft.id}`, body) : await api.post('/notes', body)
      await load()
      edit(data)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar'))
    } finally {
      setBusy(false)
    }
  }

  const togglePin = async (n) => {
    await api.put(`/notes/${n.id}`, { ...n, pinned: !n.pinned })
    load()
  }

  const remove = async () => {
    if (!window.confirm(`Excluir a anotação “${draft.title}”?`)) return
    await api.delete(`/notes/${draft.id}`)
    setDraft(null)
    load()
  }

  if (!notes) return <Loading />

  const projectName = projects.find((p) => String(p.id) === projectFilter)?.name

  return (
    <div className="page">
      <PageHead title="Anotações" subtitle="Bloco privado: ideias, procedimentos, comandos e registros.">
        <button className="btn btn-primary" onClick={() => edit({ ...EMPTY, project_id: projectFilter })}><Plus size={15} />Nova anotação</button>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: draft ? 'minmax(260px, 360px) minmax(0, 1fr)' : '1fr', alignItems: 'start' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} className="dim" style={{ position: 'absolute', left: 11, top: 12 }} />
            <input className="input" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          {projectFilter && (
            <span className="badge info" style={{ alignSelf: 'flex-start' }}>
              Projeto: {projectName || projectFilter}
              <button className="btn btn-ghost" style={{ padding: 0 }} onClick={() => setParams({})} aria-label="Limpar filtro"><X size={12} /></button>
            </span>
          )}
          {shown.length ? shown.map((n) => (
            <button key={n.id} type="button" onClick={() => edit(n)} style={{
              textAlign: 'left', background: draft?.id === n.id ? 'var(--tile-2)' : 'transparent', color: 'var(--text)',
              border: `1px solid ${draft?.id === n.id ? 'var(--border-2)' : 'transparent'}`, borderRadius: 8, padding: '8px 10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.pinned ? '📌 ' : ''}{n.title}</strong>
                <span className="dim" style={{ fontSize: 12, flex: 'none' }}>{ago(n.updated_at)}</span>
              </div>
              <div className="dim" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.project_name ? `${n.project_name} · ` : ''}{n.content.slice(0, 120) || 'Sem conteúdo'}
              </div>
              {n.tags?.length > 0 && <div className="chips" style={{ marginTop: 6 }}>{n.tags.map((t) => <span className="chip" key={t}>#{t}</span>)}</div>}
            </button>
          )) : <div className="empty">{notes.length ? 'Nada encontrado.' : 'Nenhuma anotação ainda.'}</div>}
        </div>

        {draft && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && <div className="error-box">{error}</div>}
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Título" style={{ fontSize: 17, fontWeight: 600 }} autoFocus={!draft.id} />
            <div className="grid grid-2" style={{ gap: 10 }}>
              <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="Tags separadas por vírgula" />
              <select className="select" value={draft.project_id || ''} onChange={(e) => setDraft({ ...draft, project_id: e.target.value })}>
                <option value="">Sem projeto</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <textarea className="textarea mono" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Escreva aqui..." style={{ minHeight: '46vh', fontSize: 13.5 }}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save() } }} />
            <div className="actions" style={{ justifyContent: 'space-between' }}>
              <span className="dim" style={{ fontSize: 12 }}>{draft.id ? `Atualizada em ${dateTime(draft.updated_at)} · Ctrl+S salva` : 'Ctrl+S salva'}</span>
              <span className="actions">
                {draft.id && <button className="btn btn-ghost" onClick={() => togglePin(draft).then(() => setDraft({ ...draft, pinned: !draft.pinned }))}>{draft.pinned ? <><PinOff size={15} />Desafixar</> : <><Pin size={15} />Fixar</>}</button>}
                {draft.id && <button className="btn btn-danger" onClick={remove}><Trash2 size={15} />Excluir</button>}
                <button className="btn" onClick={() => setDraft(null)}>Fechar</button>
                <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={15} />{busy ? 'Salvando...' : 'Salvar'}</button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

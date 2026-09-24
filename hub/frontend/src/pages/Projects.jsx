import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ExternalLink, Github, Pencil, Trash2, NotebookPen, Search } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { ago, host } from '../lib/format'
import { PageHead, Modal, Field, Loading } from '../components/ui'

export const STATUS = {
  em_desenvolvimento: { label: 'Em desenvolvimento', tone: 'info' },
  ativo: { label: 'Ativo', tone: 'ok' },
  manutencao: { label: 'Manutenção', tone: 'warn' },
  pausado: { label: 'Pausado', tone: '' },
  concluido: { label: 'Concluído', tone: '' },
}

const EMPTY = { name: '', client: '', status: 'em_desenvolvimento', url: '', repo_url: '', stack: '', description: '' }

export default function Projects() {
  const [projects, setProjects] = useState(null)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('')
  const [q, setQ] = useState('')

  const load = () => api.get('/projects').then(({ data }) => setProjects(data))
  useEffect(() => { load() }, [])

  if (!projects) return <Loading />

  const term = q.trim().toLowerCase()
  const shown = projects.filter((p) => (!filter || p.status === filter) && (!term ||
    [p.name, p.client, p.description, ...(p.stack || [])].some((v) => (v || '').toLowerCase().includes(term))))

  return (
    <div className="page">
      <PageHead title="Projetos" subtitle="Seus projetos e clientes: links, stack, situação e notas.">
        <button className="btn btn-primary" onClick={() => setEditing(EMPTY)}><Plus size={15} />Novo projeto</button>
      </PageHead>

      <div className="actions">
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={15} className="dim" style={{ position: 'absolute', left: 11, top: 12 }} />
          <input className="input" placeholder="Buscar por nome, cliente ou tecnologia" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Todas as situações</option>
          {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
      </div>

      {shown.length ? (
        <div className="grid grid-auto">
          {shown.map((p) => (
            <div className="card" key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 650, fontSize: 15 }}>{p.name}</div>
                  {p.client && <div className="dim" style={{ fontSize: 12.5 }}>{p.client}</div>}
                </div>
                <span className={`badge ${STATUS[p.status]?.tone || ''}`}>{STATUS[p.status]?.label || p.status}</span>
              </div>
              {p.description && <p className="note-content" style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}
              {p.stack?.length > 0 && <div className="chips">{p.stack.map((s) => <span className="chip" key={s}>{s}</span>)}</div>}
              <div className="actions" style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
                <span className="actions">
                  {p.url && <a className="btn btn-ghost" href={p.url} target="_blank" rel="noopener noreferrer" title={p.url}><ExternalLink size={14} />{host(p.url)}</a>}
                  {p.repo_url && <a className="btn btn-ghost" href={p.repo_url} target="_blank" rel="noopener noreferrer" title={p.repo_url}><Github size={14} /></a>}
                  <Link className="btn btn-ghost" to={`/anotacoes?projeto=${p.id}`} title="Anotações do projeto"><NotebookPen size={14} />{p.notes}</Link>
                </span>
                <span className="actions">
                  <span className="dim" style={{ fontSize: 12 }}>{ago(p.updated_at)}</span>
                  <button className="btn btn-ghost" onClick={() => setEditing({ ...p, stack: (p.stack || []).join(', ') })} aria-label="Editar"><Pencil size={15} /></button>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">{projects.length ? 'Nenhum projeto com esse filtro.' : 'Nenhum projeto ainda. Cadastre o primeiro em “Novo projeto”.'}</div>
      )}

      {editing && <ProjectForm project={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </div>
  )
}

function ProjectForm({ project, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, ...project })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      if (project.id) await api.put(`/projects/${project.id}`, form)
      else await api.post('/projects', form)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível salvar'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Excluir o projeto ${project.name}? As anotações ligadas a ele ficam, sem vínculo.`)) return
    await api.delete(`/projects/${project.id}`)
    onSaved()
  }

  return (
    <Modal title={project.id ? 'Editar projeto' : 'Novo projeto'} onClose={onClose} footer={
      <>
        {project.id && <button className="btn btn-danger" onClick={remove} style={{ marginRight: 'auto' }}><Trash2 size={15} />Excluir</button>}
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</button>
      </>
    }>
      {error && <div className="error-box">{error}</div>}
      <div className="grid grid-2" style={{ gap: 12 }}>
        <Field label="Nome"><input className="input" value={form.name} onChange={set('name')} autoFocus /></Field>
        <Field label="Cliente"><input className="input" value={form.client || ''} onChange={set('client')} /></Field>
        <Field label="Situação">
          <select className="select" value={form.status} onChange={set('status')}>
            {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Stack (separada por vírgula)"><input className="input" value={form.stack || ''} onChange={set('stack')} placeholder="React, Node.js, PostgreSQL" /></Field>
        <Field label="URL"><input className="input" value={form.url || ''} onChange={set('url')} placeholder="https://" /></Field>
        <Field label="Repositório"><input className="input" value={form.repo_url || ''} onChange={set('repo_url')} placeholder="https://github.com/..." /></Field>
      </div>
      <Field label="Descrição e notas"><textarea className="textarea" value={form.description || ''} onChange={set('description')} rows={6} /></Field>
    </Modal>
  )
}

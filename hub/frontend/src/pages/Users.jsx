import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'

const ROLES = {
  admin:       { label: 'Admin',          color: '#F97316' },
  dev:         { label: 'Desenvolvedor',  color: '#FFDF00' },
  colaborador: { label: 'Colaborador',    color: '#1E6FD9' },
}

const empty = { name: '', email: '', password: '', role: 'dev' }

export default function Users() {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const currentUser = JSON.parse(localStorage.getItem('hub_user') || '{}')

  const load = () => api.get('/users').then(r => setUsers(r.data))
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit = u => {
    setForm({ name: u.name || '', email: u.email, role: u.role || 'dev', password: '' })
    setEditing(u.id)
    setModal(true)
  }

  const save = async e => {
    e.preventDefault()
    const payload = { ...form }
    if (!payload.password) delete payload.password
    editing ? await api.put(`/users/${editing}`, payload) : await api.post('/users', payload)
    setModal(false)
    load()
  }

  const remove = async id => {
    if (id === currentUser.id) return alert('Não pode excluir a si mesmo.')
    if (confirm('Excluir usuário?')) { await api.delete(`/users/${id}`); load() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#EEF2FF' }}>Usuários</h2>
          <p style={{ color: '#4A6B87', fontSize: 13, marginTop: 4 }}>Gerencie colaboradores e seus níveis de acesso</p>
        </div>
        <button onClick={openNew} style={s.btnPrimary}><Plus size={16} /> Novo Usuário</button>
      </div>

      {/* Cards de resumo por role */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k} style={{ background: '#0d1e35', border: `1px solid ${v.color}33`, borderRadius: 14, padding: '16px 20px', borderLeft: `3px solid ${v.color}` }}>
            <p style={{ color: '#4A6B87', fontSize: 12, marginBottom: 6 }}>{v.label}</p>
            <p style={{ color: v.color, fontSize: 24, fontWeight: 700 }}>{users.filter(u => u.role === k).length}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a3a5c' }}>
              {['Nome', 'Email', 'Perfil', 'Acesso', 'Criado em', ''].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#4A6B87', fontSize: 13, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #020c1b' }}>
                <td style={s.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ROLES[u.role]?.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ROLES[u.role]?.color, fontWeight: 700, fontSize: 14 }}>
                      {(u.name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: '#EEF2FF' }}>{u.name || '—'}</span>
                    {u.id === currentUser.id && <span style={{ color: '#4A6B87', fontSize: 11 }}>(você)</span>}
                  </div>
                </td>
                <td style={{ ...s.td, color: '#4A6B87' }}>{u.email}</td>
                <td style={s.td}>
                  <span style={{ background: ROLES[u.role]?.color + '22', color: ROLES[u.role]?.color, padding: '3px 10px', borderRadius: 20, fontSize: 12 }}>
                    {ROLES[u.role]?.label || u.role}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#4A6B87', fontSize: 12 }}>
                  {u.role === 'admin' && 'Acesso total'}
                  {u.role === 'dev' && 'Dashboard, Projetos, Financeiro, Tickets, Monitor'}
                  {u.role === 'colaborador' && 'Tickets'}
                </td>
                <td style={{ ...s.td, color: '#4A6B87', fontSize: 12 }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(u)} style={s.iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => remove(u.id)} style={{ ...s.iconBtn, color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda de permissões */}
      <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Shield size={16} color="#4A6B87" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#8BAFC8' }}>Níveis de Permissão</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { role: 'admin', desc: 'Acesso completo: todos os módulos + gerenciamento de usuários' },
            { role: 'dev', desc: 'Dashboard, Projetos, Financeiro, Tickets e Monitor — sem gerenciar usuários' },
            { role: 'colaborador', desc: 'Apenas Tickets — ver e responder chamados atribuídos' },
          ].map(({ role, desc }) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: ROLES[role].color + '22', color: ROLES[role].color, padding: '2px 10px', borderRadius: 20, fontSize: 12, minWidth: 110, textAlign: 'center' }}>
                {ROLES[role].label}
              </span>
              <span style={{ color: '#4A6B87', fontSize: 13 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 20, fontWeight: 700, color: '#EEF2FF' }}>{editing ? 'Editar' : 'Novo'} Usuário</h3>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={s.input} placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input style={s.input} type="email" placeholder="Email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <input style={s.input} type="password" placeholder={editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editing} />
              <select style={s.input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <p style={{ color: '#4A6B87', fontSize: 12, marginTop: -4 }}>
                {form.role === 'admin' && 'Acesso total ao sistema e gerenciamento de usuários.'}
                {form.role === 'dev' && 'Acesso a todos os módulos exceto gerenciamento de usuários.'}
                {form.role === 'colaborador' && 'Acesso apenas ao módulo de Tickets.'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={s.btnSecondary}>Cancelar</button>
                <button type="submit" style={s.btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  td: { padding: '12px 16px', fontSize: 14 },
  iconBtn: { background: 'none', border: 'none', color: '#4A6B87', padding: 4, display: 'flex', cursor: 'pointer' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  btnSecondary: { flex: 1, padding: '10px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 8, color: '#8BAFC8', cursor: 'pointer' },
  input: { padding: '10px 14px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#081526', borderRadius: 16, padding: 32, width: 460, border: '1px solid #1a3a5c' },
}

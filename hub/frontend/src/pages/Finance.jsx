import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'

const empty = { project_id: '', type: 'receita', description: '', amount: '', date: new Date().toISOString().split('T')[0], paid: false }

export default function Finance() {
  const [transactions, setTransactions] = useState([])
  const [projects, setProjects] = useState([])
  const [summary, setSummary] = useState({})
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('todos')

  const load = () => {
    api.get('/finance').then(r => setTransactions(r.data))
    api.get('/finance/summary').then(r => setSummary(r.data))
    api.get('/projects').then(r => setProjects(r.data))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(empty); setEditing(null); setModal(true) }
  const openEdit = t => { setForm({ ...t, date: t.date?.split('T')[0] }); setEditing(t.id); setModal(true) }

  const save = async e => {
    e.preventDefault()
    editing ? await api.put(`/finance/${editing}`, form) : await api.post('/finance', form)
    setModal(false); load()
  }

  const remove = async id => { if (confirm('Excluir?')) { await api.delete(`/finance/${id}`); load() } }

  const filtered = filter === 'todos' ? transactions : transactions.filter(t => t.type === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#EEF2FF' }}>Financeiro</h2>
        <button onClick={openNew} style={s.btnPrimary}><Plus size={16} /> Nova Transação</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Receita do Mês', value: summary.receita_mes, color: '#009C3B' },
          { label: 'Despesas do Mês', value: summary.despesa_mes, color: '#EF4444' },
          { label: 'Saldo Total', value: summary.saldo_total, color: '#FFDF00' },
          { label: 'A Receber', value: summary.a_receber, color: '#F97316' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: '20px 24px' }}>
            <p style={{ color: '#4A6B87', fontSize: 13, marginBottom: 8 }}>{label}</p>
            <p style={{ color, fontSize: 24, fontWeight: 700 }}>R$ {parseFloat(value || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {['todos', 'receita', 'despesa'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 16px', borderRadius: 20, border: '1px solid #1a3a5c', background: filter === f ? '#FFDF00' : 'none', color: filter === f ? '#020c1b' : '#8BAFC8', fontSize: 13, fontWeight: filter === f ? 700 : 400, cursor: 'pointer' }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a3a5c' }}>
              {['Descrição', 'Projeto', 'Data', 'Tipo', 'Valor', 'Pago', ''].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#4A6B87', fontSize: 13, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #020c1b' }}>
                <td style={{ ...s.td, color: '#EEF2FF' }}>{t.description}</td>
                <td style={{ ...s.td, color: '#4A6B87' }}>{t.project_name || '—'}</td>
                <td style={{ ...s.td, color: '#4A6B87' }}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td style={s.td}>
                  <span style={{ background: t.type === 'receita' ? '#009C3B22' : '#EF444422', color: t.type === 'receita' ? '#009C3B' : '#EF4444', padding: '2px 10px', borderRadius: 20, fontSize: 12 }}>
                    {t.type}
                  </span>
                </td>
                <td style={{ ...s.td, fontWeight: 600, color: t.type === 'receita' ? '#009C3B' : '#EF4444' }}>
                  {t.type === 'receita' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2)}
                </td>
                <td style={s.td}><CheckCircle size={16} color={t.paid ? '#009C3B' : '#1a3a5c'} /></td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(t)} style={s.iconBtn}><Pencil size={14} /></button>
                    <button onClick={() => remove(t.id)} style={{ ...s.iconBtn, color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ marginBottom: 20, fontWeight: 700, color: '#EEF2FF' }}>{editing ? 'Editar' : 'Nova'} Transação</h3>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select style={s.input} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
              <input style={s.input} placeholder="Descrição *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              <input style={s.input} type="number" step="0.01" placeholder="Valor (R$) *" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
              <input style={s.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
              <select style={s.input} value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">Sem projeto</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8BAFC8', fontSize: 14 }}>
                <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} /> Pago/Recebido
              </label>
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

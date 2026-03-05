import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', form)
      onLogin(data.token, data.user)
      navigate('/meus-chamados')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Entrar</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>
        Acesse sua área para ver todos os seus chamados.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lb}>Email</label>
          <input style={inp} type="email" placeholder="seu@email.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div>
          <label style={lb}>Senha</label>
          <input style={inp} type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        </div>
        {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
        Não tem conta? <Link to="/cadastro" style={{ color: '#00d4ff' }}>Cadastrar</Link>
      </p>
    </div>
  )
}

const lb = { fontSize: 13, color: '#94a3b8', marginBottom: 6, display: 'block' }
const inp = { width: '100%', padding: '11px 14px', background: '#161b27', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '12px', fontSize: 15, width: '100%' }

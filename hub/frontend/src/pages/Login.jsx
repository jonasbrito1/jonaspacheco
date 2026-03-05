import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('hub_token', data.token)
      navigate('/')
    } catch {
      setError('Email ou senha incorretos')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>&lt;hub /&gt;</h1>
        <p style={s.sub}>Painel de Gestão · Jonas Pacheco</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={s.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>}
          <button style={s.btn} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117' },
  card: { background: '#161b27', padding: 40, borderRadius: 16, width: 360, border: '1px solid #1e293b' },
  title: { color: '#00d4ff', fontSize: 28, fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: 14, marginBottom: 32 },
  input: { padding: '12px 16px', background: '#0f1117', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14 },
  btn: { padding: '12px', background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, fontSize: 15 },
}

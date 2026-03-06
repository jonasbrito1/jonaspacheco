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
      localStorage.setItem('hub_user', JSON.stringify(data.user))
      navigate('/')
    } catch {
      setError('Email ou senha incorretos')
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={s.title}>&lt;hub /&gt;</h1>
          <p style={s.sub}>Painel de Gestão · Jonas Pacheco</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {['#009C3B','#FFDF00','#002776'].map(c => (
              <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input style={s.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={s.input} type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={{ color: '#EF4444', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020c1b', padding: 16 },
  card:  { background: '#0d1e35', padding: '40px 36px', borderRadius: 18, width: '100%', maxWidth: 380, border: '1px solid #1a3a5c', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' },
  title: { color: '#FFDF00', fontSize: 32, fontWeight: 800, letterSpacing: -1 },
  sub:   { color: '#4A6B87', fontSize: 13, marginTop: 4 },
  input: { padding: '12px 16px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#EEF2FF', fontSize: 14, outline: 'none', transition: 'border-color .2s' },
  btn:   { padding: '13px', background: '#FFDF00', border: 'none', borderRadius: 10, color: '#020c1b', fontWeight: 800, fontSize: 15, letterSpacing: 0.3 },
}

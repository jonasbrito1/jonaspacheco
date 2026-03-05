import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Register({ onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('As senhas não coincidem.')
    if (form.password.length < 6) return setError('Senha mínima: 6 caracteres.')
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password })
      onLogin(data.token, data.user)
      navigate('/meus-chamados')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao cadastrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Criar conta</h2>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
        Gerencie todos seus chamados em um só lugar. <strong style={{ color: '#94a3b8' }}>Conta é opcional</strong> — você pode abrir chamados sem cadastro.
      </p>

      {/* Opção sem conta */}
      <div style={{ background: '#0f1a2e', border: '1px solid #00d4ff33', borderRadius: 10, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff', marginBottom: 2 }}>Prefere sem cadastro?</p>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Acompanhe pelo link enviado no seu email.</p>
        </div>
        <Link to="/novo" style={{ background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, textDecoration: 'none', padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>
          Abrir sem conta
        </Link>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lb}>Nome completo *</label>
          <input style={inp} placeholder="João Silva" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label style={lb}>Email *</label>
          <input style={inp} type="email" placeholder="seu@email.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
        </div>
        <div>
          <label style={lb}>Senha *</label>
          <input style={inp} type="password" placeholder="Mínimo 6 caracteres" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
        </div>
        <div>
          <label style={lb}>Confirmar senha *</label>
          <input style={inp} type="password" placeholder="Repita a senha" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} required />
        </div>
        {error && <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
        Já tem conta? <Link to="/entrar" style={{ color: '#00d4ff' }}>Entrar</Link>
      </p>
    </div>
  )
}

const lb = { fontSize: 13, color: '#94a3b8', marginBottom: 6, display: 'block' }
const inp = { width: '100%', padding: '11px 14px', background: '#161b27', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }
const btnPrimary = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '12px', fontSize: 15, width: '100%' }

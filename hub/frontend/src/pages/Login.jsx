import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import api, { errorMessage, saveSession } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', { email, password })
        saveSession(data)
        navigate('/', { replace: true })
      } else {
        const { data } = await api.post('/auth/forgot', { email })
        setInfo(data.message)
      }
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <header>
          <img src="/avatar.jpg" alt="" />
          <strong>Hub · Jonas Pacheco</strong>
          <span>{mode === 'login' ? 'Acesso restrito' : 'Redefinir senha'}</span>
        </header>

        {error && <div className="error-box">{error}</div>}
        {info && <div className="ok-box">{info}</div>}

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" type="email" autoComplete="username" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {mode === 'login' && (
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" className="input" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy} style={{ padding: '11px 14px' }}>
          {mode === 'login' ? <><LogIn size={16} />{busy ? 'Entrando...' : 'Entrar'}</> : (busy ? 'Enviando...' : 'Enviar link por e-mail')}
        </button>

        <button type="button" className="btn btn-ghost" onClick={() => { setMode(mode === 'login' ? 'forgot' : 'login'); setError(''); setInfo('') }}>
          {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para o login'}
        </button>
      </form>
    </div>
  )
}

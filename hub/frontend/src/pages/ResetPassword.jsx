import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { errorMessage, saveSession } from '../lib/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [email, setEmail] = useState(null)
  const [invalid, setInvalid] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/auth/reset/${encodeURIComponent(token)}`)
      .then(({ data }) => setEmail(data.email))
      .catch((err) => setInvalid(errorMessage(err, 'Link inválido ou expirado')))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 10) return setError('Use ao menos 10 caracteres')
    if (password !== confirm) return setError('As senhas não conferem')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/reset', { token, password })
      saveSession(data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível redefinir'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <header>
          <img src="/avatar.jpg" alt="" />
          <strong>Definir nova senha</strong>
          <span>{email || 'Hub · Jonas Pacheco'}</span>
        </header>

        {invalid ? (
          <>
            <div className="error-box">{invalid}</div>
            <Link className="btn" to="/login">Voltar para o login</Link>
          </>
        ) : (
          <>
            {error && <div className="error-box">{error}</div>}
            <div className="field">
              <label htmlFor="p1">Nova senha (mín. 10 caracteres)</label>
              <input id="p1" className="input" type="password" autoComplete="new-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="p2">Repita a senha</label>
              <input id="p2" className="input" type="password" autoComplete="new-password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !email} style={{ padding: '11px 14px' }}>
              {busy ? 'Salvando...' : 'Salvar e entrar'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

import React, { useState } from 'react'
import { KeyRound } from 'lucide-react'
import api, { currentUser, errorMessage, saveSession } from '../lib/api'
import { PageHead, Field } from '../components/ui'

export default function Account() {
  const user = currentUser()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (form.next.length < 10) return setError('A nova senha precisa ter ao menos 10 caracteres')
    if (form.next !== form.confirm) return setError('As senhas não conferem')
    setBusy(true)
    try {
      const { data } = await api.put('/auth/password', { current: form.current, next: form.next })
      saveSession(data)
      setForm({ current: '', next: '', confirm: '' })
      setOk('Senha alterada. Sessões abertas em outros aparelhos foram encerradas.')
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível alterar a senha'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <PageHead title="Conta e senha" subtitle={user.email} />
      <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><KeyRound size={15} />Trocar senha</span></h2>
        {error && <div className="error-box">{error}</div>}
        {ok && <div className="ok-box">{ok}</div>}
        <Field label="Senha atual"><input className="input" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} required /></Field>
        <Field label="Nova senha (mín. 10 caracteres)"><input className="input" type="password" autoComplete="new-password" value={form.next} onChange={set('next')} required /></Field>
        <Field label="Repita a nova senha"><input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required /></Field>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ alignSelf: 'flex-start' }}>{busy ? 'Salvando...' : 'Salvar nova senha'}</button>
      </form>
      <p className="dim" style={{ fontSize: 12.5 }}>
        A sessão dura 12 horas. O login bloqueia por 15 minutos após 5 tentativas erradas, e só o e-mail do dono tem acesso.
      </p>
    </div>
  )
}

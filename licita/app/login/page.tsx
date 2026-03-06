'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gavel, Mail, Lock, AlertCircle } from 'lucide-react'
import { getSupabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou senha inválidos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleRegister = async () => {
    if (!email || !password) { setError('Preencha email e senha'); return }
    setLoading(true)
    setError('')
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { setError(''); setLoading(false); alert('Conta criada! Verifique seu email.') }
  }

  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gavel size={32} className="text-bg0" />
          </div>
          <h1 className="text-text1 text-2xl font-bold">LicitaSystem</h1>
          <p className="text-text3 text-sm mt-1">Gestão de Licitações com IA</p>
        </div>

        {/* Card */}
        <div className="bg-bg1 border border-[#1a3a5c] rounded-2xl p-8">
          <h2 className="text-text1 text-lg font-semibold mb-6">Entrar na plataforma</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red/10 border border-red/30 text-red text-sm px-4 py-3 rounded-lg mb-5">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-text2 font-medium block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text1 text-sm placeholder:text-text3 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text2 font-medium block mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text1 text-sm placeholder:text-text3 outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-bg0 font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#1a3a5c] text-center">
            <p className="text-text3 text-sm">
              Não tem conta?{' '}
              <button onClick={handleRegister} className="text-primary hover:underline font-medium">
                Criar conta
              </button>
            </p>
          </div>
        </div>

        {/* Branding dots */}
        <div className="flex justify-center gap-2 mt-6">
          <div className="w-2 h-2 rounded-full bg-green" />
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-blue" />
        </div>
      </div>
    </div>
  )
}

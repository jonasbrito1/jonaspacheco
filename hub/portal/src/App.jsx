import React, { useState } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { Code2, LogOut, Mail, User, Ticket, Search } from 'lucide-react'
import OpenTicket from './pages/OpenTicket'
import Track from './pages/Track'
import Login from './pages/Login'
import Register from './pages/Register'
import MyTickets from './pages/MyTickets'
import TicketDetail from './pages/TicketDetail'

function Header({ user, onLogout }) {
  return (
    <header style={{
      background: '#0f1117', borderBottom: '1px solid #1e293b',
      padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Code2 size={22} color="#00d4ff" />
        <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>suporte</span>
        <span style={{ color: '#475569', fontSize: 13 }}>/ jonaspacheco.cloud</span>
      </Link>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/novo" style={navLink}>Abrir Chamado</Link>
        {user ? (
          <>
            <Link to="/meus-chamados" style={navLink}>Meus Chamados</Link>
            <button onClick={onLogout} style={btnNav} title="Sair">
              <LogOut size={14} /> Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/entrar" style={navLink}>Entrar</Link>
            <Link to="/cadastro" style={{ ...btnPrimary, textDecoration: 'none', fontSize: 13, padding: '7px 16px' }}>Criar conta</Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portal_user')) } catch { return null }
  })
  const navigate = useNavigate()

  const login = (token, userData) => {
    localStorage.setItem('portal_token', token)
    localStorage.setItem('portal_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_user')
    setUser(null)
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a' }}>
      <Header user={user} onLogout={logout} />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px' }}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/novo" element={<OpenTicket />} />
          <Route path="/acompanhar/:token" element={<Track />} />
          <Route path="/entrar" element={<Login onLogin={login} />} />
          <Route path="/cadastro" element={<Register onLogin={login} />} />
          <Route path="/meus-chamados" element={user ? <MyTickets /> : <Navigate to="/entrar" />} />
          <Route path="/meus-chamados/:id" element={user ? <TicketDetail /> : <Navigate to="/entrar" />} />
        </Routes>
      </main>
    </div>
  )
}

function Home({ user }) {
  return (
    <div>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          Portal de <span style={{ color: '#00d4ff' }}>Suporte</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
          Abra chamados de suporte e acompanhe o status. Sem complicação — conta opcional.
        </p>
      </div>

      {/* Duas opções principais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
        {/* Sem conta */}
        <div style={{
          background: '#161b27', border: '2px solid #00d4ff44', borderRadius: 16, padding: 32,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#00d4ff22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={22} color="#00d4ff" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Sem criar conta</h3>
              <span style={{ fontSize: 11, background: '#10b98122', color: '#10b981', padding: '1px 8px', borderRadius: 10 }}>Mais rápido</span>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Abra um chamado informando apenas seu <strong style={{ color: '#94a3b8' }}>nome e email</strong>.
            Você receberá um <strong style={{ color: '#00d4ff' }}>link por email</strong> para acompanhar,
            ver respostas e adicionar informações — sem precisar criar conta.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            <Link to="/novo" style={{ ...btnCyan, textDecoration: 'none', textAlign: 'center' }}>
              Abrir chamado agora
            </Link>
            <Link to="/acompanhar/buscar" style={{ ...btnOutline, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>
              <Search size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Já tenho o link do email
            </Link>
          </div>
        </div>

        {/* Com conta */}
        <div style={{
          background: '#161b27', border: '1px solid #1e293b', borderRadius: 16, padding: 32,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#a78bfa22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color="#a78bfa" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Com conta de cliente</h3>
              <span style={{ fontSize: 11, background: '#a78bfa22', color: '#a78bfa', padding: '1px 8px', borderRadius: 10 }}>Histórico completo</span>
            </div>
          </div>
          {user ? (
            <>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Olá, <strong style={{ color: '#e2e8f0' }}>{user.name.split(' ')[0]}</strong>! Acesse
                todos os seus chamados, veja o histórico de conversas e abra novos chamados.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                <Link to="/meus-chamados" style={{ ...btnPurple, textDecoration: 'none', textAlign: 'center' }}>
                  Ver meus chamados
                </Link>
                <Link to="/novo" style={{ ...btnOutline, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>
                  <Ticket size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Abrir novo chamado
                </Link>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Crie uma conta para ter acesso ao <strong style={{ color: '#94a3b8' }}>histórico completo</strong> de
                todos os seus chamados em um só lugar, sem precisar guardar links.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                <Link to="/cadastro" style={{ ...btnPurple, textDecoration: 'none', textAlign: 'center' }}>
                  Criar conta grátis
                </Link>
                <Link to="/entrar" style={{ ...btnOutline, textDecoration: 'none', textAlign: 'center', fontSize: 13 }}>
                  Já tenho conta → Entrar
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Como funciona */}
      <div style={{ background: '#161b27', border: '1px solid #1e293b', borderRadius: 12, padding: '24px 28px' }}>
        <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 20 }}>Como funciona</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {[
            { n: '1', t: 'Abra o chamado', d: 'Descreva o problema. Só precisa do seu nome e email.' },
            { n: '2', t: 'Receba confirmação', d: 'Um email com link chega imediatamente na sua caixa.' },
            { n: '3', t: 'Equipe analisa', d: 'Nossa equipe responde diretamente no chamado.' },
            { n: '4', t: 'Acompanhe', d: 'Use o link para ver respostas e adicionar informações.' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#00d4ff22', color: '#00d4ff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.n}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{s.t}</p>
                <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const navLink = { color: '#94a3b8', textDecoration: 'none', fontSize: 14 }
const btnNav = { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '6px 12px', fontSize: 13 }
const btnPrimary = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '8px 18px' }
const btnCyan = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '12px 20px', fontSize: 14 }
const btnPurple = { background: '#a78bfa22', border: '1px solid #a78bfa44', borderRadius: 8, color: '#a78bfa', fontWeight: 700, cursor: 'pointer', padding: '12px 20px', fontSize: 14 }
const btnOutline = { background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#64748b', cursor: 'pointer', padding: '10px 20px' }

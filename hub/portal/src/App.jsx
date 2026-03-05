import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import { Code2, LogOut, User, Ticket } from 'lucide-react'
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
            <Link to="/cadastro" style={{ ...btnPrimary, textDecoration: 'none', fontSize: 13, padding: '7px 16px' }}>Cadastrar</Link>
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
      <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px' }}>
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
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          Portal de <span style={{ color: '#00d4ff' }}>Suporte</span>
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Abra chamados técnicos, acompanhe o status e receba respostas por email.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <Card
          icon={<Ticket size={28} color="#00d4ff" />}
          title="Abrir Chamado"
          desc="Relate um problema, tire uma dúvida ou solicite suporte técnico."
          action={{ label: 'Abrir agora', to: '/novo' }}
          primary
        />
        <Card
          icon={<span style={{ fontSize: 28 }}>🔍</span>}
          title="Acompanhar pelo Link"
          desc="Use o link enviado por email para ver o status do seu chamado."
          action={{ label: 'Inserir token', to: '/acompanhar/buscar' }}
        />
        {user ? (
          <Card
            icon={<User size={28} color="#a78bfa" />}
            title={'Olá, ' + user.name.split(' ')[0]}
            desc="Acesse todos os seus chamados e histórico de conversas."
            action={{ label: 'Meus chamados', to: '/meus-chamados' }}
          />
        ) : (
          <Card
            icon={<User size={28} color="#a78bfa" />}
            title="Área do Cliente"
            desc="Crie uma conta para gerenciar todos seus chamados em um só lugar."
            action={{ label: 'Cadastrar', to: '/cadastro' }}
          />
        )}
      </div>
    </div>
  )
}

function Card({ icon, title, desc, action, primary }) {
  return (
    <div style={{
      background: '#161b27', border: '1px solid ' + (primary ? '#00d4ff44' : '#1e293b'),
      borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {icon}
      <div>
        <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: 17 }}>{title}</h3>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
      </div>
      <Link to={action.to} style={{
        display: 'inline-block', marginTop: 'auto', padding: '9px 20px',
        background: primary ? '#00d4ff' : 'none',
        border: primary ? 'none' : '1px solid #334155',
        borderRadius: 8, color: primary ? '#0f1117' : '#94a3b8',
        textDecoration: 'none', fontWeight: 600, fontSize: 13, alignSelf: 'flex-start',
      }}>{action.label}</Link>
    </div>
  )
}

const navLink = { color: '#94a3b8', textDecoration: 'none', fontSize: 14 }
const btnNav = { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#94a3b8', cursor: 'pointer', padding: '6px 12px', fontSize: 13 }
const btnPrimary = { background: '#00d4ff', border: 'none', borderRadius: 8, color: '#0f1117', fontWeight: 700, cursor: 'pointer', padding: '8px 18px' }

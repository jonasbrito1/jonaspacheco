import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BarChart3, Globe, Server, FolderKanban, NotebookPen, UserCog, LogOut, Menu, ExternalLink } from 'lucide-react'
import api, { clearSession } from '../lib/api'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Visão geral', end: true },
  { to: '/acessos', icon: BarChart3, label: 'Acessos da landing' },
  { to: '/sites', icon: Globe, label: 'Sites' },
  { to: '/vps', icon: Server, label: 'VPS' },
  { to: '/projetos', icon: FolderKanban, label: 'Projetos' },
  { to: '/anotacoes', icon: NotebookPen, label: 'Anotações' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  // Confere a sessao no servidor ao abrir o hub (token vencido cai no login).
  useEffect(() => { api.get('/auth/me').catch(() => {}) }, [])

  const logout = () => {
    clearSession()
    navigate('/login')
  }

  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <img src="/avatar.jpg" alt="" />
          <div>
            <strong>Jonas Pacheco</strong>
            <span>hub pessoal</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}><Icon size={17} />{label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="https://jonaspacheco.cloud" target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Abrir a landing</a>
          <NavLink to="/conta" style={{ display: 'flex' }}><UserCog size={15} />Conta e senha</NavLink>
          <button type="button" onClick={logout}><LogOut size={15} />Sair</button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="topbar">
          <button className="btn btn-ghost" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <strong>{current?.label || 'Hub'}</strong>
        </div>
        <main className="main" onClick={() => open && setOpen(false)}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

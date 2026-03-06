import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, DollarSign, Activity, LogOut, Ticket, Users, CheckSquare, Menu, X } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const currentUser = JSON.parse(localStorage.getItem('hub_user') || '{}')

  const logout = () => {
    localStorage.removeItem('hub_token')
    localStorage.removeItem('hub_user')
    navigate('/login')
  }

  const nav = [
    { to: '/',         icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin', 'dev'] },
    { to: '/projects', icon: FolderKanban,    label: 'Projetos',   roles: ['admin', 'dev'] },
    { to: '/finance',  icon: DollarSign,      label: 'Financeiro', roles: ['admin', 'dev'] },
    { to: '/tickets',  icon: Ticket,          label: 'Tickets',    roles: ['admin', 'dev', 'colaborador'] },
    { to: '/taskflow', icon: CheckSquare,     label: 'TaskFlow',   roles: ['admin', 'dev', 'colaborador'] },
    { to: '/monitor',  icon: Activity,        label: 'Monitor',    roles: ['admin', 'dev'] },
    { to: '/users',    icon: Users,           label: 'Usuários',   roles: ['admin'] },
  ].filter(item => item.roles.includes(currentUser.role))

  const roleLabel = { admin: 'Admin', dev: 'Desenvolvedor', colaborador: 'Colaborador' }

  const SidebarContent = () => (
    <>
      <div style={st.logo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#FFDF00', fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>&lt;hub /&gt;</span>
        </div>
        <span style={{ color: '#4A6B87', fontSize: 11, marginTop: 2 }}>jonaspacheco.cloud</span>
      </div>
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
            style={({ isActive }) => ({ ...st.navItem, ...(isActive ? st.navActive : {}) })}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
      <div style={st.userBox}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#FFDF0022', border: '1px solid #FFDF0044', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFDF00', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#EEF2FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser.name || currentUser.email}
          </p>
          <p style={{ fontSize: 11, color: '#4A6B87' }}>{roleLabel[currentUser.role] || currentUser.role}</p>
        </div>
      </div>
      <button onClick={logout} style={st.logout}><LogOut size={15} /> Sair</button>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020c1b' }}>
      {/* Mobile hamburger */}
      <button className="hub-hamburger" onClick={() => setOpen(true)}
        style={{ display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 400, background: '#081526', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF', padding: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {open && <div className="hub-overlay" onClick={() => setOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 299 }} />}

      {/* Sidebar */}
      <aside className={`hub-sidebar${open ? ' open' : ''}`}
        style={{ ...st.sidebar, position: 'relative' }}>
        {open && <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#8BAFC8', cursor: 'pointer' }}><X size={18} /></button>}
        <SidebarContent />
      </aside>

      <main className="hub-main" style={st.main}><Outlet /></main>
    </div>
  )
}

const st = {
  sidebar: { width: 220, background: '#081526', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #1a3a5c', minHeight: '100vh' },
  logo: { display: 'flex', flexDirection: 'column', padding: '0 20px 20px', borderBottom: '1px solid #1a3a5c', marginBottom: 8 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: '#8BAFC8', fontSize: 14, transition: 'all .15s', textDecoration: 'none' },
  navActive: { color: '#FFDF00', background: 'linear-gradient(90deg, #FFDF0010 0%, transparent 100%)', borderRight: '3px solid #FFDF00', fontWeight: 600 },
  userBox: { display: 'flex', alignItems: 'center', gap: 10, margin: '12px 16px 8px', padding: '12px', background: '#06101e', borderRadius: 10, border: '1px solid #1a3a5c' },
  main: { flex: 1, padding: 32, overflowY: 'auto', background: '#020c1b' },
  logout: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 16px', padding: '10px 12px', background: 'none', border: '1px solid #1a3a5c', borderRadius: 8, color: '#4A6B87', fontSize: 13 },
}

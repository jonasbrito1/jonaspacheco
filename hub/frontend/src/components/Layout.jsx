import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, DollarSign, Activity, LogOut, Ticket, Users, CheckSquare } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('hub_user') || '{}')
  const isAdmin = currentUser.role === 'admin'

  const logout = () => {
    localStorage.removeItem('hub_token')
    localStorage.removeItem('hub_user')
    navigate('/login')
  }

  const nav = [
    { to: '/',        icon: LayoutDashboard, label: 'Dashboard',  roles: ['admin', 'dev'] },
    { to: '/projects',icon: FolderKanban,    label: 'Projetos',   roles: ['admin', 'dev'] },
    { to: '/finance', icon: DollarSign,      label: 'Financeiro', roles: ['admin', 'dev'] },
    { to: '/tickets',  icon: Ticket,       label: 'Tickets',    roles: ['admin', 'dev', 'colaborador'] },
    { to: '/taskflow', icon: CheckSquare,  label: 'TaskFlow',   roles: ['admin', 'dev', 'colaborador'] },
    { to: '/monitor',  icon: Activity,     label: 'Monitor',    roles: ['admin', 'dev'] },
    { to: '/users',   icon: Users,           label: 'Usuários',   roles: ['admin'] },
  ].filter(item => item.roles.includes(currentUser.role))

  const roleLabel = { admin: 'Admin', dev: 'Desenvolvedor', colaborador: 'Colaborador' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: 18 }}>&lt;hub /&gt;</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>jonaspacheco</span>
        </div>
        <nav style={{ flex: 1 }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navActive : {}) })}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.userInfo}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff', fontWeight: 700, fontSize: 14 }}>
            {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.name || currentUser.email}
            </p>
            <p style={{ fontSize: 11, color: '#64748b' }}>{roleLabel[currentUser.role] || currentUser.role}</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logout}><LogOut size={16} /> Sair</button>
      </aside>
      <main style={styles.main}><Outlet /></main>
    </div>
  )
}

const styles = {
  sidebar: { width: 220, background: '#161b27', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #1e293b' },
  logo: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 20px 24px', borderBottom: '1px solid #1e293b', marginBottom: 12 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: '#94a3b8', fontSize: 14, transition: 'all .2s', textDecoration: 'none' },
  navActive: { color: '#00d4ff', background: '#0f1a2e', borderRight: '2px solid #00d4ff' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, margin: '12px 20px 8px', padding: '12px', background: '#0f1117', borderRadius: 10, border: '1px solid #1e293b' },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  logout: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 20px', padding: '10px 12px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#64748b', fontSize: 14, cursor: 'pointer' },
}

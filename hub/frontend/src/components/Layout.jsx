import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, DollarSign, Activity, LogOut } from 'lucide-react'

const nav = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',icon: FolderKanban,    label: 'Projetos' },
  { to: '/finance', icon: DollarSign,      label: 'Financeiro' },
  { to: '/monitor', icon: Activity,        label: 'Monitor' },
]

export default function Layout() {
  const navigate = useNavigate()
  const logout = () => { localStorage.removeItem('hub_token'); navigate('/login') }

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
        <button onClick={logout} style={styles.logout}><LogOut size={16} /> Sair</button>
      </aside>
      <main style={styles.main}><Outlet /></main>
    </div>
  )
}

const styles = {
  sidebar: { width: 220, background: '#161b27', display: 'flex', flexDirection: 'column', padding: '24px 0', borderRight: '1px solid #1e293b' },
  logo: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 20px 24px', borderBottom: '1px solid #1e293b', marginBottom: 12 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', color: '#94a3b8', fontSize: 14, transition: 'all .2s' },
  navActive: { color: '#00d4ff', background: '#0f1a2e', borderRight: '2px solid #00d4ff' },
  main: { flex: 1, padding: 32, overflowY: 'auto' },
  logout: { display: 'flex', alignItems: 'center', gap: 8, margin: '0 20px', padding: '10px 12px', background: 'none', border: '1px solid #1e293b', borderRadius: 8, color: '#64748b', fontSize: 14 },
}

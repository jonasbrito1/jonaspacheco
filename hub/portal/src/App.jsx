import React, { Suspense, lazy, useMemo, useState } from 'react'
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { Code2, LogOut, Mail, User, Ticket, Search, NotebookText } from 'lucide-react'
import OpenTicket from './pages/OpenTicket'
import Track from './pages/Track'
import Login from './pages/Login'
import Register from './pages/Register'
import MyTickets from './pages/MyTickets'
import TicketDetail from './pages/TicketDetail'
import LoadingScreen from './components/LoadingScreen'

const BlogHome = lazy(() => import('./pages/blog/BlogHome'))
const BlogArticle = lazy(() => import('./pages/blog/BlogArticle'))
const BlogCategory = lazy(() => import('./pages/blog/BlogCategory'))
const BlogTag = lazy(() => import('./pages/blog/BlogTag'))
const BlogSearch = lazy(() => import('./pages/blog/BlogSearch'))

function Header({ user, onLogout }) {
  return (
    <header style={{
      background: '#081526', borderBottom: '1px solid #1a3a5c',
      padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Code2 size={22} color="#FFDF00" />
        <span style={{ fontWeight: 700, fontSize: 16, color: '#EEF2FF' }}>suporte</span>
        <span style={{ color: '#475569', fontSize: 13 }}>/ jonaspacheco.cloud</span>
      </Link>
      <nav className="portal-nav" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/novo" style={navLink}>Abrir Chamado</Link>
        <Link to="/blog" style={navLink}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><NotebookText size={14} /> Blog</span></Link>
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

function lazyPage(element) {
  return <Suspense fallback={<LoadingScreen label="Carregando Blog..." />}>{element}</Suspense>
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('portal_user')) } catch { return null }
  })
  const navigate = useNavigate()
  const location = useLocation()
  const isBlogRoute = location.pathname === '/blog' || location.pathname.startsWith('/blog/')

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

  if (isBlogRoute) {
    return (
      <BlogSiteLayout>
        <Routes>
          <Route path="/blog" element={lazyPage(<BlogHome />)} />
          <Route path="/blog/:slug" element={lazyPage(<BlogArticle />)} />
          <Route path="/blog/categoria/:slug" element={lazyPage(<BlogCategory />)} />
          <Route path="/blog/tag/:slug" element={lazyPage(<BlogTag />)} />
          <Route path="/blog/busca" element={lazyPage(<BlogSearch />)} />
          <Route path="*" element={<Navigate to="/blog" replace />} />
        </Routes>
      </BlogSiteLayout>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#020c1b' }}>
      <Header user={user} onLogout={logout} />
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 20px' }}>
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/novo" element={<OpenTicket />} />
          <Route path="/acompanhar/:token" element={<Track />} />
          <Route path="/entrar" element={<Login onLogin={login} />} />
          <Route path="/cadastro" element={<Register onLogin={login} />} />
          <Route path="/meus-chamados" element={user ? <MyTickets /> : <Navigate to="/entrar" />} />
          <Route path="/meus-chamados/:id" element={user ? <TicketDetail /> : <Navigate to="/entrar" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function BlogSiteLayout({ children }) {
  const location = useLocation()
  const navItems = useMemo(() => ([
    { label: 'Início', href: 'https://jonaspacheco.cloud/#home' },
    { label: 'Sobre', href: 'https://jonaspacheco.cloud/#about' },
    { label: 'Especialidades', href: 'https://jonaspacheco.cloud/#expertise' },
    { label: 'Projetos', href: 'https://jonaspacheco.cloud/#projects' },
    { label: 'Blog', href: '/blog', active: true },
    { label: 'Contato', href: 'https://jonaspacheco.cloud/#contact' },
  ]), [])

  return (
    <div style={{ minHeight: '100vh', background: '#020c1b', color: '#EEF2FF' }}>
      <header className="blog-site-header" style={blogHeader}>
        <div className="blog-site-header-inner" style={blogHeaderInner}>
          <a href="https://jonaspacheco.cloud" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="https://jonaspacheco.cloud/jp-logo.png" alt="Jonas Pacheco" style={{ width: 186, height: 34, objectFit: 'contain' }} />
          </a>
          <nav className="blog-site-nav" style={blogNav}>
            {navItems.map(item => {
              const isActive = item.active || location.pathname.startsWith('/blog')
              const style = isActive && item.label === 'Blog' ? { ...blogNavLink, ...blogNavLinkActive } : blogNavLink
              return item.href.startsWith('/')
                ? <Link key={item.label} to={item.href} style={style}>{item.label}</Link>
                : <a key={item.label} href={item.href} style={style}>{item.label}</a>
            })}
          </nav>
          <a href="https://jonaspacheco.cloud/#contact" style={blogCta}>Entrar em contato</a>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 20px 72px' }}>
        {children}
      </main>

      <footer style={blogFooter}>
        <div className="blog-site-footer-inner" style={blogFooterInner}>
          <div style={{ display: 'grid', gap: 14 }}>
            <a href="https://jonaspacheco.cloud" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <img src="https://jonaspacheco.cloud/jp-logo.png" alt="Jonas Pacheco" style={{ width: 186, height: 34, objectFit: 'contain' }} />
            </a>
            <p style={{ color: '#8BAFC8', fontSize: 14, lineHeight: 1.7, maxWidth: 420 }}>
              Artigos sobre desenvolvimento fullstack, arquitetura, automação e DevSecOps dentro do ecossistema Jonas Pacheco.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <p style={footerTitle}>Navegação</p>
            <a href="https://jonaspacheco.cloud/#about" style={footerLink}>Sobre</a>
            <a href="https://jonaspacheco.cloud/#projects" style={footerLink}>Projetos</a>
            <Link to="/blog" style={footerLink}>Blog</Link>
            <a href="https://jonaspacheco.cloud/#contact" style={footerLink}>Contato</a>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <p style={footerTitle}>Acompanhe</p>
            <a href="https://github.com/jonasbrito1" target="_blank" rel="noopener noreferrer" style={footerLink}>GitHub</a>
            <a href="https://www.linkedin.com/in/jonasbrito1/" target="_blank" rel="noopener noreferrer" style={footerLink}>LinkedIn</a>
            <a href="https://www.instagram.com/jonasbritopacheco/" target="_blank" rel="noopener noreferrer" style={footerLink}>Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Home({ user }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
          Portal de <span style={{ color: '#FFDF00' }}>Suporte</span>
        </h1>
        <p style={{ color: '#4A6B87', fontSize: 16, maxWidth: 520, margin: '0 auto' }}>
          Abra chamados de suporte e acompanhe o status. Sem complicação — conta opcional.
        </p>
      </div>

      <div className="portal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
        <div style={{
          background: '#0d1e35', border: '2px solid #FFDF0044', borderRadius: 16, padding: 32,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFDF0022', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={22} color="#FFDF00" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Sem criar conta</h3>
              <span style={{ fontSize: 11, background: '#009C3B22', color: '#009C3B', padding: '1px 8px', borderRadius: 10 }}>Mais rápido</span>
            </div>
          </div>
          <p style={{ color: '#4A6B87', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            Abra um chamado informando apenas seu <strong style={{ color: '#8BAFC8' }}>nome e email</strong>.
            Você receberá um <strong style={{ color: '#FFDF00' }}>link por email</strong> para acompanhar,
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

        <div style={{
          background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 16, padding: 32,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1E6FD922', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color="#1E6FD9" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>Com conta de cliente</h3>
              <span style={{ fontSize: 11, background: '#1E6FD922', color: '#1E6FD9', padding: '1px 8px', borderRadius: 10 }}>Histórico completo</span>
            </div>
          </div>
          {user ? (
            <>
              <p style={{ color: '#4A6B87', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Olá, <strong style={{ color: '#EEF2FF' }}>{user.name.split(' ')[0]}</strong>! Acesse
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
              <p style={{ color: '#4A6B87', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Crie uma conta para ter acesso ao <strong style={{ color: '#8BAFC8' }}>histórico completo</strong> de
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

      <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 12, padding: '24px 28px' }}>
        <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 20 }}>Como funciona</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {[
            { n: '1', t: 'Abra o chamado', d: 'Descreva o problema. Só precisa do seu nome e email.' },
            { n: '2', t: 'Receba confirmação', d: 'Um email com link chega imediatamente na sua caixa.' },
            { n: '3', t: 'Equipe analisa', d: 'Nossa equipe responde diretamente no chamado.' },
            { n: '4', t: 'Acompanhe', d: 'Use o link para ver respostas e adicionar informações.' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFDF0022', color: '#FFDF00', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step.n}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{step.t}</p>
                <p style={{ color: '#4A6B87', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const navLink = { color: '#8BAFC8', textDecoration: 'none', fontSize: 14 }
const btnNav = { display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid #1a3a5c', borderRadius: 8, color: '#8BAFC8', cursor: 'pointer', padding: '6px 12px', fontSize: 13 }
const btnPrimary = { background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 800, cursor: 'pointer', padding: '8px 18px' }
const btnCyan = { background: '#FFDF00', border: 'none', borderRadius: 8, color: '#020c1b', fontWeight: 800, cursor: 'pointer', padding: '12px 20px', fontSize: 14 }
const btnPurple = { background: '#1E6FD922', border: '1px solid #1E6FD944', borderRadius: 8, color: '#1E6FD9', fontWeight: 700, cursor: 'pointer', padding: '12px 20px', fontSize: 14 }
const btnOutline = { background: 'none', border: '1px solid #1a3a5c', borderRadius: 8, color: '#4A6B87', cursor: 'pointer', padding: '10px 20px' }
const blogHeader = { position: 'sticky', top: 0, zIndex: 80, backdropFilter: 'blur(16px)', background: 'rgba(2,12,27,0.86)', borderBottom: '1px solid rgba(26,58,92,0.9)' }
const blogHeaderInner = { maxWidth: 1180, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }
const blogNav = { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }
const blogNavLink = { color: '#8BAFC8', fontSize: 14, textDecoration: 'none', padding: '8px 10px', borderRadius: 999, transition: 'all 0.2s ease' }
const blogNavLinkActive = { color: '#00d4ff', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.22)' }
const blogCta = { padding: '10px 16px', borderRadius: 999, background: 'linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)', color: '#04111f', fontWeight: 800, fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }
const blogFooter = { borderTop: '1px solid rgba(26,58,92,0.9)', background: '#06101e' }
const blogFooterInner = { maxWidth: 1180, margin: '0 auto', padding: '42px 20px 52px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))', gap: 28 }
const footerTitle = { color: '#EEF2FF', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }
const footerLink = { color: '#8BAFC8', fontSize: 14, textDecoration: 'none' }

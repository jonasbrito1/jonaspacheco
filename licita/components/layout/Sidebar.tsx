'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, FileText, Search, FolderOpen,
  Calculator, Bot, Settings, Gavel, LogOut
} from 'lucide-react'
import { getSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/licitacoes', icon: Gavel, label: 'Licitações' },
  { href: '/analise', icon: Search, label: 'Análise de Edital' },
  { href: '/documentos', icon: FolderOpen, label: 'Documentos' },
  { href: '/propostas', icon: Calculator, label: 'Calculadora' },
  { href: '/ia', icon: Bot, label: 'Assistente IA' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 shrink-0 bg-bg1 border-r border-[#1a3a5c] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a3a5c]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Gavel size={16} className="text-bg0" />
          </div>
          <div>
            <div className="text-text1 font-bold text-sm leading-tight">LicitaSystem</div>
            <div className="text-text3 text-xs">Gestão de Licitações</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-primary/10 text-primary border-l-2 border-primary pl-2.5'
                  : 'text-text2 hover:text-text1 hover:bg-bg2'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-[#1a3a5c] pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text2 hover:text-red hover:bg-red/10 transition-all"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}

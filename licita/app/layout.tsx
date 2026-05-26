import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LicitaSystem — Gestão de Licitações',
  description: 'Sistema de gestão de licitações com IA integrada',
  icons: {
    icon: '/jp-logo.png',
    shortcut: '/jp-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}

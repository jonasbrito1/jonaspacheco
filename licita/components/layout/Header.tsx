'use client'
import { Bell, User } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-14 bg-bg1 border-b border-[#1a3a5c] px-6 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-text1 font-bold text-base leading-tight">{title}</h1>
        {subtitle && <p className="text-text3 text-xs">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg bg-bg2 border border-[#1a3a5c] flex items-center justify-center text-text2 hover:text-text1 transition-colors">
          <Bell size={15} />
        </button>
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <User size={15} className="text-primary" />
        </div>
      </div>
    </header>
  )
}

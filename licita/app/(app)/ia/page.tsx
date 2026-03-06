'use client'
import { Header } from '@/components/layout/Header'
import { AIChat } from '@/components/AIChat'

export default function IAPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header title="Assistente IA" subtitle="Especialista em licitações públicas brasileiras" />
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <AIChat />
      </div>
    </div>
  )
}

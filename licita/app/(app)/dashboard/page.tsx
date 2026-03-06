'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSupabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getDaysUntil } from '@/lib/utils'
import type { Licitacao } from '@/types/database'
import { Gavel, TrendingUp, Trophy, DollarSign, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const PIPELINE_STAGES = [
  { status: 'analise', label: 'Em Análise', color: '#FFDF00' },
  { status: 'documentacao', label: 'Documentação', color: '#F97316' },
  { status: 'proposta_enviada', label: 'Proposta Enviada', color: '#1E6FD9' },
  { status: 'resultado', label: 'Aguardando Resultado', color: '#8BAFC8' },
  { status: 'ganhou', label: 'Ganhou', color: '#009C3B' },
  { status: 'perdeu', label: 'Perdeu', color: '#EF4444' },
]

export default function DashboardPage() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.from('licitacoes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setLicitacoes(data || []); setLoading(false) })
  }, [])

  const total = licitacoes.length
  const emAnalise = licitacoes.filter(l => l.status === 'analise').length
  const ganhas = licitacoes.filter(l => l.status === 'ganhou').length
  const taxaSucesso = total > 0 ? Math.round((ganhas / total) * 100) : 0
  const valorEmJogo = licitacoes
    .filter(l => ['analise','documentacao','proposta_enviada','resultado'].includes(l.status))
    .reduce((sum, l) => sum + (l.valor_estimado || 0), 0)

  const upcoming = licitacoes
    .filter(l => l.data_limite_proposta && getDaysUntil(l.data_limite_proposta) !== null && getDaysUntil(l.data_limite_proposta)! >= 0 && getDaysUntil(l.data_limite_proposta)! <= 30)
    .sort((a, b) => new Date(a.data_limite_proposta!).getTime() - new Date(b.data_limite_proposta!).getTime())

  const stats = [
    { label: 'Total Licitações', value: total, icon: Gavel, color: '#1E6FD9' },
    { label: 'Em Análise', value: emAnalise, icon: TrendingUp, color: '#FFDF00' },
    { label: 'Taxa de Sucesso', value: `${taxaSucesso}%`, icon: Trophy, color: '#009C3B' },
    { label: 'Valor em Jogo', value: formatCurrency(valorEmJogo), icon: DollarSign, color: '#F97316', small: true },
  ]

  if (loading) return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral das suas licitações" />
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" subtitle="Visão geral das suas licitações" />
      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}22` }}>
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <div className={`font-bold text-text1 ${stat.small ? 'text-lg' : 'text-2xl'}`}>{stat.value}</div>
                <div className="text-text3 text-xs">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Pipeline */}
          <div className="xl:col-span-2">
            <h2 className="text-text1 font-semibold mb-3 text-sm">Pipeline de Oportunidades</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage) => {
                const items = licitacoes.filter(l => l.status === stage.status)
                return (
                  <div key={stage.status} className="min-w-[180px] bg-bg1 border border-[#1a3a5c] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-text2 text-xs font-medium">{stage.label}</span>
                      <span className="ml-auto bg-bg2 text-text3 text-xs px-1.5 py-0.5 rounded-full">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.slice(0, 4).map((l) => (
                        <Link key={l.id} href={`/licitacoes/${l.id}`}>
                          <div className="bg-bg2 rounded-lg p-2 hover:border-primary/50 border border-transparent transition-colors cursor-pointer">
                            <div className="text-text1 text-xs font-medium truncate">{l.objeto.slice(0, 40)}{l.objeto.length > 40 ? '...' : ''}</div>
                            <div className="text-text3 text-xs mt-1 truncate">{l.orgao}</div>
                            {l.valor_estimado && (
                              <div className="text-primary text-xs font-semibold mt-1">{formatCurrency(l.valor_estimado)}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                      {items.length === 0 && (
                        <div className="text-text3 text-xs text-center py-4">Nenhuma</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div>
            <h2 className="text-text1 font-semibold mb-3 text-sm">Próximos Prazos</h2>
            <Card className="space-y-2 max-h-80 overflow-y-auto">
              {upcoming.length === 0 ? (
                <div className="text-text3 text-sm text-center py-6">Nenhum prazo nos próximos 30 dias</div>
              ) : upcoming.map((l) => {
                const days = getDaysUntil(l.data_limite_proposta)!
                const urgent = days <= 7
                return (
                  <Link key={l.id} href={`/licitacoes/${l.id}`}>
                    <div className={`flex items-start gap-3 p-2 rounded-lg hover:bg-bg2 transition-colors border ${urgent ? 'border-red/30 bg-red/5' : 'border-transparent'}`}>
                      <div className="mt-0.5">
                        {urgent ? <AlertTriangle size={14} className="text-red" /> : <Clock size={14} className="text-text3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-text1 text-xs font-medium truncate">{l.objeto.slice(0, 35)}...</div>
                        <div className="text-text3 text-xs">{formatDate(l.data_limite_proposta)}</div>
                      </div>
                      <div className={`text-xs font-bold shrink-0 ${urgent ? 'text-red' : 'text-text2'}`}>
                        {days}d
                      </div>
                    </div>
                  </Link>
                )
              })}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

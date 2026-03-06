'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { getSupabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getModalidadeLabel, getScoreColor } from '@/lib/utils'
import type { Licitacao, StatusLicitacao, AnaliseIARecord } from '@/types/database'
import { ArrowLeft, Bot, CheckCircle, AlertTriangle, FileText, Target, Calendar, DollarSign, Building } from 'lucide-react'

const STATUS_OPTIONS: StatusLicitacao[] = ['analise','documentacao','proposta_enviada','resultado','ganhou','perdeu','cancelada']
const STATUS_LABELS: Record<string, string> = { analise: 'Em Análise', documentacao: 'Documentação', proposta_enviada: 'Proposta Enviada', resultado: 'Aguardando Resultado', ganhou: 'Ganhou', perdeu: 'Perdeu', cancelada: 'Cancelada' }

export default function LicitacaoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [licitacao, setLicitacao] = useState<Licitacao | null>(null)
  const [analises, setAnalises] = useState<AnaliseIARecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const supabase = getSupabase()

  useEffect(() => {
    Promise.all([
      supabase.from('licitacoes').select('*').eq('id', id).single(),
      supabase.from('analises_ia').select('*').eq('licitacao_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: l }, { data: a }]) => {
      setLicitacao(l)
      setAnalises(a || [])
      setLoading(false)
    })
  }, [id])

  const updateStatus = async (status: StatusLicitacao) => {
    setUpdatingStatus(true)
    await supabase.from('licitacoes').update({ status }).eq('id', id)
    setLicitacao(prev => prev ? { ...prev, status } : null)
    setUpdatingStatus(false)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!licitacao) return <div className="flex-1 flex items-center justify-center text-text3">Licitação não encontrada</div>

  const ia = licitacao.analise_ia

  return (
    <div className="flex flex-col flex-1">
      <Header title={licitacao.numero_edital} subtitle={licitacao.orgao} />
      <div className="flex-1 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
          <ArrowLeft size={14} /> Voltar
        </Button>

        {/* Top info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2">
            <h2 className="text-text1 font-semibold text-sm mb-3">{licitacao.objeto}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-text3 text-xs mb-1 flex items-center gap-1"><Building size={11} /> Órgão</div><div className="text-text1 text-xs">{licitacao.orgao}</div></div>
              <div><div className="text-text3 text-xs mb-1 flex items-center gap-1"><FileText size={11} /> Modalidade</div><div className="text-text1 text-xs">{getModalidadeLabel(licitacao.modalidade)}</div></div>
              <div><div className="text-text3 text-xs mb-1 flex items-center gap-1"><DollarSign size={11} /> Valor Est.</div><div className="text-primary text-xs font-bold">{formatCurrency(licitacao.valor_estimado)}</div></div>
              <div><div className="text-text3 text-xs mb-1 flex items-center gap-1"><Calendar size={11} /> Prazo Proposta</div><div className="text-text1 text-xs">{formatDate(licitacao.data_limite_proposta)}</div></div>
            </div>
            {licitacao.exclusivo_me_epp && <Badge color="#009C3B" className="mt-3">Exclusivo ME/EPP</Badge>}
          </Card>

          <Card>
            <div className="mb-3">
              <div className="text-text3 text-xs mb-2">Status atual</div>
              <Select value={licitacao.status} onChange={e => updateStatus(e.target.value as StatusLicitacao)} disabled={updatingStatus}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </Select>
            </div>
            {ia?.score_viabilidade != null && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text3 text-xs">Score de Viabilidade</span>
                  <span className="text-sm font-bold" style={{ color: getScoreColor(ia.score_viabilidade) }}>{ia.score_viabilidade}/100</span>
                </div>
                <Progress value={ia.score_viabilidade} color={getScoreColor(ia.score_viabilidade)} />
                {ia.justificativa_score && <p className="text-text3 text-xs mt-2">{ia.justificativa_score}</p>}
              </div>
            )}
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="analise">
          <TabsList>
            <TabsTrigger value="analise">Análise IA</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="analise">
            {!ia ? (
              <Card className="text-center py-10">
                <Bot size={40} className="text-text3 mx-auto mb-3" />
                <p className="text-text2 mb-4">Nenhuma análise de IA disponível</p>
                <Button onClick={() => router.push('/analise')} size="sm"><Bot size={14} /> Analisar com IA</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ia.documentos_exigidos && ia.documentos_exigidos.length > 0 && (
                  <Card>
                    <h3 className="text-text1 font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={14} className="text-blue" /> Documentos Exigidos</h3>
                    <ul className="space-y-1.5">
                      {ia.documentos_exigidos.map((doc, i) => (
                        <li key={i} className="text-text2 text-xs flex items-start gap-2"><CheckCircle size={12} className="text-green mt-0.5 shrink-0" />{doc}</li>
                      ))}
                    </ul>
                  </Card>
                )}
                {ia.riscos && ia.riscos.length > 0 && (
                  <Card>
                    <h3 className="text-text1 font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle size={14} className="text-orange" /> Riscos Identificados</h3>
                    <ul className="space-y-1.5">
                      {ia.riscos.map((risco, i) => (
                        <li key={i} className="text-text2 text-xs flex items-start gap-2"><AlertTriangle size={12} className="text-orange mt-0.5 shrink-0" />{risco}</li>
                      ))}
                    </ul>
                  </Card>
                )}
                {ia.criterios_tecnicos && ia.criterios_tecnicos.length > 0 && (
                  <Card>
                    <h3 className="text-text1 font-semibold text-sm mb-3 flex items-center gap-2"><Target size={14} className="text-primary" /> Critérios Técnicos</h3>
                    <ul className="space-y-1.5">
                      {ia.criterios_tecnicos.map((c, i) => <li key={i} className="text-text2 text-xs">• {c}</li>)}
                    </ul>
                  </Card>
                )}
                {ia.recomendacoes && ia.recomendacoes.length > 0 && (
                  <Card>
                    <h3 className="text-text1 font-semibold text-sm mb-3 flex items-center gap-2"><CheckCircle size={14} className="text-green" /> Recomendações</h3>
                    <ul className="space-y-1.5">
                      {ia.recomendacoes.map((r, i) => <li key={i} className="text-text2 text-xs">• {r}</li>)}
                    </ul>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historico">
            <div className="space-y-3">
              {analises.length === 0 ? (
                <Card className="text-center py-8 text-text3">Nenhuma análise registrada</Card>
              ) : analises.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color="#1E6FD9">{a.tipo}</Badge>
                    <span className="text-text3 text-xs">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-text2 text-sm whitespace-pre-wrap">{a.resposta?.slice(0, 300)}{(a.resposta?.length || 0) > 300 ? '...' : ''}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getSupabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Licitacao, CustoProposta } from '@/types/database'
import { Plus, Trash2, Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

type LinhaItem = { id: string; descricao: string; valor: string; categoria: string }

const CATEGORIAS = ['Mão de Obra', 'Material', 'Equipamento', 'BDI', 'Impostos', 'Outros']

export default function PropostasPage() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [margem, setMargem] = useState('15')
  const [linhas, setLinhas] = useState<LinhaItem[]>([
    { id: '1', descricao: '', valor: '', categoria: 'Mão de Obra' },
  ])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = getSupabase()

  useEffect(() => {
    supabase.from('licitacoes')
      .select('id, objeto, orgao, valor_estimado, data_limite_proposta')
      .in('status', ['analise', 'documentacao'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setLicitacoes((data as Licitacao[]) || []))
  }, [])

  const selected = licitacoes.find(l => l.id === selectedId)

  const totalCustos = linhas.reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)
  const margemPct = parseFloat(margem) || 0
  const valorProposta = totalCustos * (1 + margemPct / 100)
  const lucroAbsoluto = valorProposta - totalCustos

  const diffVsEstimado = selected?.valor_estimado
    ? ((valorProposta - selected.valor_estimado) / selected.valor_estimado) * 100
    : null

  const addLinha = () => setLinhas(prev => [...prev, { id: Date.now().toString(), descricao: '', valor: '', categoria: 'Mão de Obra' }])
  const removeLinha = (id: string) => setLinhas(prev => prev.filter(l => l.id !== id))
  const updateLinha = (id: string, field: keyof LinhaItem, value: string) =>
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))

  const saveProposta = async () => {
    if (!selectedId) return
    setSaving(true)
    const custos: CustoProposta[] = linhas.filter(l => l.descricao && l.valor).map(l => ({
      descricao: l.descricao,
      valor: parseFloat(l.valor),
      categoria: l.categoria,
    }))
    await supabase.from('propostas').insert({
      licitacao_id: selectedId,
      valor_proposta: valorProposta,
      custos,
      margem_lucro: margemPct,
      observacoes: null,
    })
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const viabilidade = diffVsEstimado === null ? null
    : diffVsEstimado > 10 ? 'alto' : diffVsEstimado > -10 ? 'ok' : 'baixo'

  return (
    <div className="flex flex-col flex-1">
      <Header title="Calculadora de Lances" subtitle="Simule propostas e calcule margens" />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Licitacao selector */}
          <Card className="mb-5">
            <Label>Licitação de Referência (opcional)</Label>
            <Select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Sem licitação vinculada</option>
              {licitacoes.map(l => (
                <option key={l.id} value={l.id}>{l.objeto?.slice(0, 60)} — {l.orgao}</option>
              ))}
            </Select>
            {selected && (
              <div className="flex gap-4 mt-3 text-xs">
                <span className="text-text3">Valor Est.: <strong className="text-primary">{formatCurrency(selected.valor_estimado)}</strong></span>
                <span className="text-text3">Prazo: <strong className="text-text1">{formatDate(selected.data_limite_proposta)}</strong></span>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Custos */}
            <div className="lg:col-span-2">
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-text1 font-semibold text-sm flex items-center gap-2"><Calculator size={14} className="text-primary" /> Breakdown de Custos</h2>
                  <Button variant="secondary" size="sm" onClick={addLinha}><Plus size={12} /> Linha</Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs text-text3 px-1 mb-1">
                    <div className="col-span-5">Descrição</div>
                    <div className="col-span-3">Categoria</div>
                    <div className="col-span-3">Valor (R$)</div>
                    <div className="col-span-1" />
                  </div>
                  {linhas.map((linha) => (
                    <div key={linha.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <Input value={linha.descricao} onChange={e => updateLinha(linha.id, 'descricao', e.target.value)} placeholder="Ex: Mão de obra técnica" />
                      </div>
                      <div className="col-span-3">
                        <Select value={linha.categoria} onChange={e => updateLinha(linha.id, 'categoria', e.target.value)}>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" value={linha.valor} onChange={e => updateLinha(linha.id, 'valor', e.target.value)} placeholder="0,00" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {linhas.length > 1 && (
                          <button onClick={() => removeLinha(linha.id)} className="text-text3 hover:text-red transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#1a3a5c] flex justify-between text-sm">
                  <span className="text-text2">Total de Custos</span>
                  <span className="text-text1 font-bold">{formatCurrency(totalCustos)}</span>
                </div>
              </Card>
            </div>

            {/* Result */}
            <div className="space-y-4">
              <Card>
                <h2 className="text-text1 font-semibold text-sm mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-primary" /> Resultado</h2>
                <div className="space-y-3">
                  <div>
                    <Label>Margem de Lucro (%)</Label>
                    <Input type="number" step="0.1" value={margem} onChange={e => setMargem(e.target.value)} />
                  </div>
                  <div className="space-y-2 pt-2 border-t border-[#1a3a5c]">
                    <div className="flex justify-between text-xs"><span className="text-text3">Total Custos</span><span className="text-text1">{formatCurrency(totalCustos)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-text3">Margem ({margemPct}%)</span><span className="text-green">{formatCurrency(lucroAbsoluto)}</span></div>
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#1a3a5c]">
                      <span className="text-text1">Valor da Proposta</span>
                      <span className="text-primary">{formatCurrency(valorProposta)}</span>
                    </div>
                  </div>

                  {diffVsEstimado !== null && (
                    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      viabilidade === 'baixo' ? 'border-red/30 bg-red/5 text-red' :
                      viabilidade === 'alto' ? 'border-orange/30 bg-orange/5 text-orange' :
                      'border-green/30 bg-green/5 text-green'
                    }`}>
                      {viabilidade === 'ok' ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                      <div>
                        <div className="font-semibold">
                          {diffVsEstimado > 0 ? `${diffVsEstimado.toFixed(1)}% acima` : `${Math.abs(diffVsEstimado).toFixed(1)}% abaixo`} do estimado
                        </div>
                        <div className="mt-0.5">
                          {viabilidade === 'baixo' ? 'Proposta muito abaixo — verifique custos' :
                           viabilidade === 'alto' ? 'Proposta acima do estimado — risco de desclassificação' :
                           'Proposta competitiva'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={saveProposta} disabled={saving || !selectedId || totalCustos === 0} className="w-full mt-4" variant="green">
                  {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : 'Salvar Proposta'}
                </Button>
                {!selectedId && <p className="text-text3 text-xs text-center mt-2">Selecione uma licitação para salvar</p>}
              </Card>

              {/* Category summary */}
              <Card>
                <h3 className="text-text1 font-semibold text-xs mb-3">Por Categoria</h3>
                {CATEGORIAS.map(cat => {
                  const catTotal = linhas.filter(l => l.categoria === cat).reduce((s, l) => s + (parseFloat(l.valor) || 0), 0)
                  if (catTotal === 0) return null
                  const pct = totalCustos > 0 ? (catTotal / totalCustos) * 100 : 0
                  return (
                    <div key={cat} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-text2">{cat}</span>
                        <span className="text-text1 font-medium">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-bg0 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

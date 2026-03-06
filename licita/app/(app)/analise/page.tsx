'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { getSupabase } from '@/lib/supabase'
import { formatCurrency, getScoreColor } from '@/lib/utils'
import type { ModalidadeLicitacao } from '@/types/database'
import { Upload, FileText, Bot, CheckCircle, AlertTriangle, Loader2, X, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AnaliseResult = {
  orgao?: string
  numero_edital?: string
  objeto?: string
  modalidade?: ModalidadeLicitacao
  valor_estimado?: number
  data_abertura?: string
  data_limite_proposta?: string
  exclusivo_me_epp?: boolean
  documentos_exigidos?: string[]
  criterios_tecnicos?: string[]
  riscos?: string[]
  score_viabilidade?: number
  justificativa_score?: string
  recomendacoes?: string[]
}

const MODALIDADE_LABELS: Record<string, string> = {
  pregao_eletronico: 'Pregão Eletrônico', pregao_presencial: 'Pregão Presencial',
  dispensa: 'Dispensa', inexigibilidade: 'Inexigibilidade',
  convite: 'Convite', tomada_de_precos: 'Tomada de Preços', concorrencia: 'Concorrência',
}

export default function AnalisePage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [orgao, setOrgao] = useState('')
  const [numeroEdital, setNumeroEdital] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnaliseResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  const analyze = async () => {
    if (!file) { setError('Selecione um arquivo PDF'); return }
    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (orgao) formData.append('orgao', orgao)
      if (numeroEdital) formData.append('numero_edital', numeroEdital)

      const res = await fetch('/api/analyze-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na análise')
      setResult(data)
      if (data.orgao && !orgao) setOrgao(data.orgao)
      if (data.numero_edital && !numeroEdital) setNumeroEdital(data.numero_edital)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar PDF')
    } finally {
      setAnalyzing(false)
    }
  }

  const saveAndCreate = async () => {
    if (!result) return
    setSaving(true)
    const supabase = getSupabase()
    const { data, error } = await supabase.from('licitacoes').insert({
      numero_edital: result.numero_edital || numeroEdital || 'N/D',
      orgao: result.orgao || orgao || 'N/D',
      objeto: result.objeto || 'Objeto a definir',
      modalidade: result.modalidade || 'pregao_eletronico',
      valor_estimado: result.valor_estimado || null,
      data_abertura: result.data_abertura || null,
      data_limite_proposta: result.data_limite_proposta || null,
      status: 'analise',
      score_viabilidade: result.score_viabilidade || null,
      analise_ia: result,
      exclusivo_me_epp: result.exclusivo_me_epp || false,
    }).select().single()
    if (!error && data) router.push(`/licitacoes/${data.id}`)
    else { setError('Erro ao salvar'); setSaving(false) }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Análise de Edital" subtitle="Upload de PDF para extração automática com IA" />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Upload */}
          <Card>
            <h2 className="text-text1 font-semibold text-sm mb-4 flex items-center gap-2"><Upload size={14} className="text-primary" /> Upload do Edital</h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-[#1a3a5c] hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} className="text-primary" />
                  <div>
                    <div className="text-text1 font-medium text-sm">{file.name}</div>
                    <div className="text-text3 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="ml-2 text-text3 hover:text-red">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={32} className="text-text3 mx-auto mb-3" />
                  <p className="text-text2 text-sm">Arraste o PDF do edital aqui</p>
                  <p className="text-text3 text-xs mt-1">ou clique para selecionar</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Órgão (opcional — será extraído do PDF)</Label>
                <Input value={orgao} onChange={e => setOrgao(e.target.value)} placeholder="Prefeitura de..." />
              </div>
              <div>
                <Label>Nº do Edital (opcional)</Label>
                <Input value={numeroEdital} onChange={e => setNumeroEdital(e.target.value)} placeholder="PE 001/2025" />
              </div>
            </div>

            {error && <p className="text-red text-sm mt-3 flex items-center gap-2"><AlertTriangle size={14} />{error}</p>}

            <Button onClick={analyze} disabled={!file || analyzing} className="mt-4 w-full">
              {analyzing ? <><Loader2 size={14} className="animate-spin" /> Analisando com IA...</> : <><Bot size={14} /> Analisar com IA</>}
            </Button>
          </Card>

          {/* Result */}
          {result && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-text1 font-semibold text-sm flex items-center gap-2"><Bot size={14} className="text-primary" /> Resultado da Análise</h2>
                {result.score_viabilidade != null && (
                  <div className="flex items-center gap-3">
                    <span className="text-text3 text-xs">Viabilidade</span>
                    <span className="text-lg font-bold" style={{ color: getScoreColor(result.score_viabilidade) }}>{result.score_viabilidade}/100</span>
                    <Progress value={result.score_viabilidade} color={getScoreColor(result.score_viabilidade)} className="w-20" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {result.orgao && <div><div className="text-text3 text-xs mb-1">Órgão</div><div className="text-text1 text-sm font-medium">{result.orgao}</div></div>}
                {result.modalidade && <div><div className="text-text3 text-xs mb-1">Modalidade</div><div className="text-text1 text-sm">{MODALIDADE_LABELS[result.modalidade] || result.modalidade}</div></div>}
                {result.valor_estimado && <div><div className="text-text3 text-xs mb-1">Valor Estimado</div><div className="text-primary text-sm font-bold">{formatCurrency(result.valor_estimado)}</div></div>}
                {result.data_limite_proposta && <div><div className="text-text3 text-xs mb-1">Prazo da Proposta</div><div className="text-text1 text-sm">{result.data_limite_proposta}</div></div>}
                {result.exclusivo_me_epp !== undefined && <div><div className="text-text3 text-xs mb-1">ME/EPP</div><Badge color={result.exclusivo_me_epp ? '#009C3B' : '#4A6B87'}>{result.exclusivo_me_epp ? 'Exclusivo' : 'Não exclusivo'}</Badge></div>}
              </div>

              {result.objeto && (
                <div className="mb-4 p-3 bg-bg2 rounded-lg border border-[#1a3a5c]">
                  <div className="text-text3 text-xs mb-1">Objeto</div>
                  <div className="text-text1 text-sm">{result.objeto}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.documentos_exigidos && result.documentos_exigidos.length > 0 && (
                  <div>
                    <h3 className="text-text1 text-xs font-semibold mb-2 flex items-center gap-1"><CheckCircle size={11} className="text-green" /> Documentos Exigidos</h3>
                    <ul className="space-y-1">{result.documentos_exigidos.map((d, i) => <li key={i} className="text-text2 text-xs">• {d}</li>)}</ul>
                  </div>
                )}
                {result.riscos && result.riscos.length > 0 && (
                  <div>
                    <h3 className="text-text1 text-xs font-semibold mb-2 flex items-center gap-1"><AlertTriangle size={11} className="text-orange" /> Riscos</h3>
                    <ul className="space-y-1">{result.riscos.map((r, i) => <li key={i} className="text-red text-xs">• {r}</li>)}</ul>
                  </div>
                )}
                {result.recomendacoes && result.recomendacoes.length > 0 && (
                  <div>
                    <h3 className="text-text1 text-xs font-semibold mb-2 flex items-center gap-1"><Target size={11} className="text-primary" /> Recomendações</h3>
                    <ul className="space-y-1">{result.recomendacoes.map((r, i) => <li key={i} className="text-text2 text-xs">• {r}</li>)}</ul>
                  </div>
                )}
              </div>

              {result.justificativa_score && (
                <p className="mt-4 text-text2 text-xs p-3 bg-bg2 rounded-lg border border-[#1a3a5c]">{result.justificativa_score}</p>
              )}

              <Button onClick={saveAndCreate} disabled={saving} className="mt-5 w-full" variant="green">
                {saving ? 'Salvando...' : <><CheckCircle size={14} /> Salvar e Criar Licitação</>}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

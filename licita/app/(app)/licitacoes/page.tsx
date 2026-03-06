'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { getSupabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, getStatusLabel, getModalidadeLabel, getScoreColor } from '@/lib/utils'
import type { Licitacao, StatusLicitacao, ModalidadeLicitacao } from '@/types/database'
import { Plus, Search, ExternalLink, Trash2, Filter } from 'lucide-react'
import Link from 'next/link'

const STATUS_OPTIONS: StatusLicitacao[] = ['analise','documentacao','proposta_enviada','resultado','ganhou','perdeu','cancelada']
const MODALIDADE_OPTIONS: ModalidadeLicitacao[] = ['pregao_eletronico','pregao_presencial','dispensa','inexigibilidade','convite','tomada_de_precos','concorrencia']

const MODALIDADE_LABELS: Record<string, string> = {
  pregao_eletronico: 'Pregão Eletrônico', pregao_presencial: 'Pregão Presencial',
  dispensa: 'Dispensa', inexigibilidade: 'Inexigibilidade',
  convite: 'Convite', tomada_de_precos: 'Tomada de Preços', concorrencia: 'Concorrência',
}

const EMPTY_FORM = { numero_edital: '', orgao: '', objeto: '', modalidade: 'pregao_eletronico' as ModalidadeLicitacao, valor_estimado: '', data_abertura: '', data_limite_proposta: '', exclusivo_me_epp: false }

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const supabase = getSupabase()

  useEffect(() => {
    supabase.from('licitacoes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setLicitacoes(data || []); setLoading(false) })
  }, [])

  const filtered = licitacoes.filter(l => {
    const matchSearch = !search || l.objeto.toLowerCase().includes(search.toLowerCase()) || l.orgao.toLowerCase().includes(search.toLowerCase()) || l.numero_edital.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || l.status === filterStatus
    return matchSearch && matchStatus
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase.from('licitacoes').insert({
      numero_edital: form.numero_edital,
      orgao: form.orgao,
      objeto: form.objeto,
      modalidade: form.modalidade,
      valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
      data_abertura: form.data_abertura || null,
      data_limite_proposta: form.data_limite_proposta || null,
      status: 'analise',
      exclusivo_me_epp: form.exclusivo_me_epp,
    }).select().single()
    if (!error && data) {
      setLicitacoes(prev => [data, ...prev])
      setShowModal(false)
      setForm(EMPTY_FORM)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta licitação?')) return
    await supabase.from('licitacoes').delete().eq('id', id)
    setLicitacoes(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Licitações" subtitle={`${licitacoes.length} licitações cadastradas`} />
      <div className="flex-1 p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text3" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por objeto, órgão, edital..."
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text1 text-sm placeholder:text-text3 outline-none focus:border-primary transition-colors" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text2 text-sm outline-none">
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
          </select>
          <Button onClick={() => setShowModal(true)} size="sm">
            <Plus size={14} /> Nova Licitação
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-text3 mb-2">Nenhuma licitação encontrada</div>
            <Button onClick={() => setShowModal(true)} size="sm"><Plus size={14} /> Cadastrar primeira</Button>
          </Card>
        ) : (
          <div className="bg-bg1 border border-[#1a3a5c] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1a3a5c]">
                  {['Edital / Órgão', 'Modalidade', 'Valor', 'Prazo', 'Score', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-text3 text-xs font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-[#1a3a5c] hover:bg-bg2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-text1 text-sm font-medium truncate max-w-[200px]">{l.objeto}</div>
                      <div className="text-text3 text-xs">{l.orgao} · {l.numero_edital}</div>
                    </td>
                    <td className="px-4 py-3 text-text2 text-xs">{MODALIDADE_LABELS[l.modalidade] || l.modalidade}</td>
                    <td className="px-4 py-3 text-text1 text-sm font-semibold">{formatCurrency(l.valor_estimado)}</td>
                    <td className="px-4 py-3 text-text2 text-xs">{formatDate(l.data_limite_proposta)}</td>
                    <td className="px-4 py-3">
                      {l.score_viabilidade != null ? (
                        <div className="flex items-center gap-2">
                          <Progress value={l.score_viabilidade} color={getScoreColor(l.score_viabilidade)} className="w-16" />
                          <span className="text-xs font-bold" style={{ color: getScoreColor(l.score_viabilidade) }}>{l.score_viabilidade}</span>
                        </div>
                      ) : <span className="text-text3 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={getStatusColor(l.status)}>{getStatusLabel(l.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/licitacoes/${l.id}`}><Button variant="ghost" size="icon"><ExternalLink size={14} /></Button></Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)} className="hover:text-red"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Nova Licitação" className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número do Edital *</Label>
              <Input value={form.numero_edital} onChange={e => setForm(f => ({ ...f, numero_edital: e.target.value }))} placeholder="PE 001/2025" required />
            </div>
            <div>
              <Label>Modalidade *</Label>
              <Select value={form.modalidade} onChange={e => setForm(f => ({ ...f, modalidade: e.target.value as ModalidadeLicitacao }))}>
                {MODALIDADE_OPTIONS.map(m => <option key={m} value={m}>{MODALIDADE_LABELS[m]}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Órgão Licitante *</Label>
            <Input value={form.orgao} onChange={e => setForm(f => ({ ...f, orgao: e.target.value }))} placeholder="Prefeitura Municipal de..." required />
          </div>
          <div>
            <Label>Objeto *</Label>
            <Textarea value={form.objeto} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} placeholder="Descrição do objeto da licitação" required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm(f => ({ ...f, valor_estimado: e.target.value }))} placeholder="0,00" />
            </div>
            <div>
              <Label>Data de Abertura</Label>
              <Input type="date" value={form.data_abertura} onChange={e => setForm(f => ({ ...f, data_abertura: e.target.value }))} />
            </div>
            <div>
              <Label>Prazo da Proposta</Label>
              <Input type="date" value={form.data_limite_proposta} onChange={e => setForm(f => ({ ...f, data_limite_proposta: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.exclusivo_me_epp} onChange={e => setForm(f => ({ ...f, exclusivo_me_epp: e.target.checked }))} className="accent-primary" />
            <span className="text-text2 text-sm">Exclusivo ME/EPP</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando...' : 'Criar Licitação'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

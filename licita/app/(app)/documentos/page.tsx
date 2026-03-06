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
import { getSupabase } from '@/lib/supabase'
import { formatDate, getStatusColor, getStatusLabel, getTipoDocumentoLabel, getDaysUntil, isDateExpired } from '@/lib/utils'
import type { Documento, TipoDocumento, StatusDocumento } from '@/types/database'
import { Plus, FolderOpen, AlertTriangle, CheckCircle, Clock, Trash2, Upload } from 'lucide-react'

const TIPOS: TipoDocumento[] = ['juridica', 'fiscal', 'tecnica', 'financeira', 'declaracao']
const TIPO_ICONS: Record<string, React.ReactNode> = {
  juridica: '⚖️', fiscal: '📋', tecnica: '🔧', financeira: '💰', declaracao: '📄',
}

const EMPTY_FORM = { tipo: 'juridica' as TipoDocumento, nome: '', data_validade: '' }

function getDocStatus(doc: Documento): StatusDocumento {
  if (!doc.data_validade) return 'valido'
  if (isDateExpired(doc.data_validade)) return 'vencido'
  const days = getDaysUntil(doc.data_validade)
  if (days !== null && days <= 30) return 'vencendo'
  return 'valido'
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filterTipo, setFilterTipo] = useState('')

  const supabase = getSupabase()

  useEffect(() => {
    supabase.from('documentos').select('*').order('data_validade', { ascending: true })
      .then(({ data }) => { setDocumentos(data || []); setLoading(false) })
  }, [])

  const grouped = TIPOS.reduce((acc, tipo) => {
    acc[tipo] = documentos.filter(d => d.tipo === tipo && (!filterTipo || d.tipo === filterTipo))
    return acc
  }, {} as Record<string, Documento[]>)

  const vencendo = documentos.filter(d => {
    const days = getDaysUntil(d.data_validade)
    return days !== null && days >= 0 && days <= 30
  })
  const vencidos = documentos.filter(d => isDateExpired(d.data_validade || ''))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const doc = {
      tipo: form.tipo,
      nome: form.nome,
      data_validade: form.data_validade || null,
      status: 'valido' as StatusDocumento,
    }
    const { data, error } = await supabase.from('documentos').insert(doc).select().single()
    if (!error && data) {
      setDocumentos(prev => [...prev, data].sort((a, b) => a.data_validade && b.data_validade ? new Date(a.data_validade).getTime() - new Date(b.data_validade).getTime() : 0))
      setShowModal(false)
      setForm(EMPTY_FORM)
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir documento?')) return
    await supabase.from('documentos').delete().eq('id', id)
    setDocumentos(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="flex flex-col flex-1">
      <Header title="Gestão Documental" subtitle={`${documentos.length} documentos cadastrados`} />
      <div className="flex-1 p-6">
        {/* Alerts */}
        {(vencendo.length > 0 || vencidos.length > 0) && (
          <div className="flex gap-3 mb-5 flex-wrap">
            {vencidos.length > 0 && (
              <div className="flex items-center gap-2 bg-red/10 border border-red/30 text-red text-sm px-4 py-2 rounded-lg">
                <AlertTriangle size={14} /> {vencidos.length} documento(s) vencido(s)
              </div>
            )}
            {vencendo.length > 0 && (
              <div className="flex items-center gap-2 bg-orange/10 border border-orange/30 text-orange text-sm px-4 py-2 rounded-lg">
                <Clock size={14} /> {vencendo.length} vencendo em 30 dias
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex gap-3 mb-5">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="h-9 px-3 rounded-lg bg-bgInput border border-[#1a3a5c] text-text2 text-sm outline-none">
            <option value="">Todas as categorias</option>
            {TIPOS.map(t => <option key={t} value={t}>{getTipoDocumentoLabel(t)}</option>)}
          </select>
          <Button onClick={() => setShowModal(true)} size="sm" className="ml-auto">
            <Plus size={14} /> Novo Documento
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {TIPOS.filter(tipo => !filterTipo || tipo === filterTipo).map(tipo => {
              const docs = grouped[tipo] || []
              return (
                <div key={tipo}>
                  <h2 className="text-text2 font-semibold text-sm mb-3 flex items-center gap-2">
                    <span>{TIPO_ICONS[tipo]}</span>
                    {getTipoDocumentoLabel(tipo)}
                    <span className="bg-bg2 text-text3 text-xs px-2 py-0.5 rounded-full ml-1">{docs.length}</span>
                  </h2>
                  {docs.length === 0 ? (
                    <Card className="text-center py-6 text-text3 text-sm">Nenhum documento nesta categoria</Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {docs.map(doc => {
                        const computedStatus = getDocStatus(doc)
                        const days = getDaysUntil(doc.data_validade)
                        return (
                          <Card key={doc.id} className={computedStatus === 'vencido' ? 'border-red/30' : computedStatus === 'vencendo' ? 'border-orange/30' : ''}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-text1 text-sm font-medium truncate">{doc.nome}</div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge color={getStatusColor(computedStatus)}>{getStatusLabel(computedStatus)}</Badge>
                                  {doc.data_validade && (
                                    <span className="text-text3 text-xs">{formatDate(doc.data_validade)}</span>
                                  )}
                                </div>
                                {days !== null && days >= 0 && days <= 30 && (
                                  <div className="text-orange text-xs mt-1 flex items-center gap-1">
                                    <Clock size={11} /> Vence em {days} dia(s)
                                  </div>
                                )}
                              </div>
                              <button onClick={() => handleDelete(doc.id)} className="text-text3 hover:text-red transition-colors shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={showModal} onClose={() => setShowModal(false)} title="Novo Documento">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label>Categoria *</Label>
            <Select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoDocumento }))}>
              {TIPOS.map(t => <option key={t} value={t}>{getTipoDocumentoLabel(t)}</option>)}
            </Select>
          </div>
          <div>
            <Label>Nome do Documento *</Label>
            <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Certidão Negativa FGTS" required />
          </div>
          <div>
            <Label>Data de Validade</Label>
            <Input type="date" value={form.data_validade} onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Salvando...' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

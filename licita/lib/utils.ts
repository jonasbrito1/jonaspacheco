import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return 'R$ —'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateRelative(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
  } catch {
    return '—'
  }
}

export function getDaysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  return differenceInDays(new Date(date), new Date())
}

export function isDateExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false
  return isPast(new Date(date))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    analise: '#FFDF00',
    documentacao: '#F97316',
    proposta_enviada: '#1E6FD9',
    resultado: '#8BAFC8',
    ganhou: '#009C3B',
    perdeu: '#EF4444',
    cancelada: '#4A6B87',
    valido: '#009C3B',
    vencendo: '#F97316',
    vencido: '#EF4444',
    pendente: '#FFDF00',
  }
  return colors[status] || '#4A6B87'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    analise: 'Em Análise',
    documentacao: 'Documentação',
    proposta_enviada: 'Proposta Enviada',
    resultado: 'Aguardando Resultado',
    ganhou: 'Ganhou',
    perdeu: 'Perdeu',
    cancelada: 'Cancelada',
    valido: 'Válido',
    vencendo: 'Vencendo',
    vencido: 'Vencido',
    pendente: 'Pendente',
  }
  return labels[status] || status
}

export function getModalidadeLabel(modalidade: string): string {
  const labels: Record<string, string> = {
    pregao_eletronico: 'Pregão Eletrônico',
    pregao_presencial: 'Pregão Presencial',
    dispensa: 'Dispensa',
    inexigibilidade: 'Inexigibilidade',
    convite: 'Convite',
    tomada_de_precos: 'Tomada de Preços',
    concorrencia: 'Concorrência',
  }
  return labels[modalidade] || modalidade
}

export function getScoreColor(score: number | null): string {
  if (score == null) return '#4A6B87'
  if (score >= 70) return '#009C3B'
  if (score >= 40) return '#FFDF00'
  return '#EF4444'
}

export function getTipoDocumentoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    juridica: 'Habilitação Jurídica',
    fiscal: 'Regularidade Fiscal',
    tecnica: 'Qualificação Técnica',
    financeira: 'Econômico-Financeira',
    declaracao: 'Declarações',
  }
  return labels[tipo] || tipo
}

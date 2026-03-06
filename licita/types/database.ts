export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ModalidadeLicitacao =
  | 'pregao_eletronico'
  | 'pregao_presencial'
  | 'dispensa'
  | 'inexigibilidade'
  | 'convite'
  | 'tomada_de_precos'
  | 'concorrencia'

export type StatusLicitacao =
  | 'analise'
  | 'documentacao'
  | 'proposta_enviada'
  | 'resultado'
  | 'ganhou'
  | 'perdeu'
  | 'cancelada'

export type StatusDocumento = 'valido' | 'vencendo' | 'vencido' | 'pendente'
export type TipoDocumento = 'juridica' | 'fiscal' | 'tecnica' | 'financeira' | 'declaracao'
export type TipoAnaliseIA = 'edital' | 'documentacao' | 'lance' | 'chat'

export interface AnaliseIA {
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

export interface CustoProposta {
  descricao: string
  valor: number
  categoria: string
}

export interface Licitacao {
  id: string
  numero_edital: string
  orgao: string
  objeto: string
  modalidade: ModalidadeLicitacao
  valor_estimado: number | null
  data_abertura: string | null
  data_limite_proposta: string | null
  status: StatusLicitacao
  score_viabilidade: number | null
  arquivo_edital: string | null
  analise_ia: AnaliseIA | null
  exclusivo_me_epp: boolean
  created_at: string
  updated_at: string
}

export interface Documento {
  id: string
  tipo: TipoDocumento
  nome: string
  arquivo_url: string | null
  data_validade: string | null
  status: StatusDocumento
  created_at: string
}

export interface Proposta {
  id: string
  licitacao_id: string
  valor_proposta: number | null
  custos: CustoProposta[] | null
  margem_lucro: number | null
  observacoes: string | null
  arquivo_proposta: string | null
  created_at: string
}

export interface AnaliseIARecord {
  id: string
  licitacao_id: string | null
  prompt: string | null
  resposta: string | null
  tipo: TipoAnaliseIA
  created_at: string
}

// Supabase Database type
export interface Database {
  public: {
    Tables: {
      licitacoes: {
        Row: Licitacao
        Insert: Omit<Licitacao, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Licitacao, 'id' | 'created_at' | 'updated_at'>>
      }
      documentos: {
        Row: Documento
        Insert: Omit<Documento, 'id' | 'created_at'>
        Update: Partial<Omit<Documento, 'id' | 'created_at'>>
      }
      propostas: {
        Row: Proposta
        Insert: Omit<Proposta, 'id' | 'created_at'>
        Update: Partial<Omit<Proposta, 'id' | 'created_at'>>
      }
      analises_ia: {
        Row: AnaliseIARecord
        Insert: Omit<AnaliseIARecord, 'id' | 'created_at'>
        Update: Partial<Omit<AnaliseIARecord, 'id' | 'created_at'>>
      }
    }
  }
}

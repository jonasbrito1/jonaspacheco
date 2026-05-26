'use client'

import type { AnaliseIARecord, Database, Documento, Licitacao, Proposta } from '@/types/database'

type TableName = keyof Database['public']['Tables']
type TableRowMap = {
  licitacoes: Licitacao
  documentos: Documento
  propostas: Proposta
  analises_ia: AnaliseIARecord
}

type SessionUser = {
  id: string
  email: string
}

type StoredUser = SessionUser & {
  password: string
}

type QueryResult<T> = Promise<{ data: T; error: null }>

const STORAGE_KEYS = {
  licitacoes: 'licita_local_licitacoes',
  documentos: 'licita_local_documentos',
  propostas: 'licita_local_propostas',
  analises_ia: 'licita_local_analises_ia',
  users: 'licita_local_users',
  session: 'licita_local_session',
  seeded: 'licita_local_seeded',
} as const

const DEMO_USER: StoredUser = {
  id: 'user-demo',
  email: 'licitacoes@local.dev',
  password: '123456',
}

function nowIso() {
  return new Date().toISOString()
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function seedLocalData() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(STORAGE_KEYS.seeded)) return

  const licitacaoId = createId()
  const createdAt = nowIso()

  const licitacoes: Licitacao[] = [
    {
      id: licitacaoId,
      numero_edital: 'PE 014/2026',
      orgao: 'Prefeitura Municipal de Manaus',
      objeto: 'Contratacao de servicos de suporte tecnico, sustentacao e evolucao de sistemas web.',
      modalidade: 'pregao_eletronico',
      valor_estimado: 185000,
      data_abertura: createdAt,
      data_limite_proposta: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12).toISOString(),
      status: 'analise',
      score_viabilidade: 78,
      arquivo_edital: null,
      analise_ia: {
        orgao: 'Prefeitura Municipal de Manaus',
        numero_edital: 'PE 014/2026',
        objeto: 'Contratacao de servicos de suporte tecnico, sustentacao e evolucao de sistemas web.',
        modalidade: 'pregao_eletronico',
        valor_estimado: 185000,
        score_viabilidade: 78,
        justificativa_score: 'Escopo aderente, prazo factivel e risco tecnico moderado.',
        documentos_exigidos: ['Certidao Federal', 'Atestado de capacidade tecnica'],
        riscos: ['Prazo curto para apresentacao da proposta'],
        recomendacoes: ['Validar equipe tecnica e cronograma antes do envio'],
      },
      exclusivo_me_epp: false,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ]

  const documentos: Documento[] = [
    {
      id: createId(),
      tipo: 'fiscal',
      nome: 'Certidao Negativa Federal',
      arquivo_url: null,
      data_validade: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10),
      status: 'valido',
      created_at: createdAt,
    },
    {
      id: createId(),
      tipo: 'tecnica',
      nome: 'Atestado de Capacidade Tecnica',
      arquivo_url: null,
      data_validade: null,
      status: 'valido',
      created_at: createdAt,
    },
  ]

  const analises: AnaliseIARecord[] = [
    {
      id: createId(),
      licitacao_id: licitacaoId,
      prompt: 'Analise inicial do edital',
      resposta: 'Oportunidade viavel para empresa com experiencia em sustentacao de sistemas.',
      tipo: 'edital',
      created_at: createdAt,
    },
  ]

  writeJson(STORAGE_KEYS.licitacoes, licitacoes)
  writeJson(STORAGE_KEYS.documentos, documentos)
  writeJson(STORAGE_KEYS.propostas, [])
  writeJson(STORAGE_KEYS.analises_ia, analises)
  writeJson(STORAGE_KEYS.users, [DEMO_USER])
  writeJson(STORAGE_KEYS.seeded, true)
}

function getTableRows<T extends TableName>(table: T): TableRowMap[T][] {
  seedLocalData()
  return readJson<TableRowMap[T][]>(STORAGE_KEYS[table], [])
}

function setTableRows<T extends TableName>(table: T, rows: TableRowMap[T][]) {
  writeJson(STORAGE_KEYS[table], rows)
}

function getUsers() {
  seedLocalData()
  return readJson<StoredUser[]>(STORAGE_KEYS.users, [DEMO_USER])
}

function setUsers(users: StoredUser[]) {
  writeJson(STORAGE_KEYS.users, users)
}

function getSessionUser() {
  seedLocalData()
  return readJson<SessionUser | null>(STORAGE_KEYS.session, null)
}

function setSessionUser(user: SessionUser | null) {
  if (user) writeJson(STORAGE_KEYS.session, user)
  else if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEYS.session)
}

function applyDefaults<T extends TableName>(table: T, row: Record<string, unknown>): TableRowMap[T] {
  const id = String(row.id || createId())
  const createdAt = String(row.created_at || nowIso())

  if (table === 'licitacoes') {
    return {
      id,
      numero_edital: String(row.numero_edital || 'N/D'),
      orgao: String(row.orgao || 'N/D'),
      objeto: String(row.objeto || 'Objeto a definir'),
      modalidade: (row.modalidade as Licitacao['modalidade']) || 'pregao_eletronico',
      valor_estimado: row.valor_estimado == null ? null : Number(row.valor_estimado),
      data_abertura: row.data_abertura ? String(row.data_abertura) : null,
      data_limite_proposta: row.data_limite_proposta ? String(row.data_limite_proposta) : null,
      status: (row.status as Licitacao['status']) || 'analise',
      score_viabilidade: row.score_viabilidade == null ? null : Number(row.score_viabilidade),
      arquivo_edital: row.arquivo_edital ? String(row.arquivo_edital) : null,
      analise_ia: (row.analise_ia as Licitacao['analise_ia']) || null,
      exclusivo_me_epp: Boolean(row.exclusivo_me_epp),
      created_at: createdAt,
      updated_at: String(row.updated_at || createdAt),
    } as TableRowMap[T]
  }

  if (table === 'documentos') {
    return {
      id,
      tipo: (row.tipo as Documento['tipo']) || 'juridica',
      nome: String(row.nome || 'Documento'),
      arquivo_url: row.arquivo_url ? String(row.arquivo_url) : null,
      data_validade: row.data_validade ? String(row.data_validade) : null,
      status: (row.status as Documento['status']) || 'valido',
      created_at: createdAt,
    } as TableRowMap[T]
  }

  if (table === 'propostas') {
    return {
      id,
      licitacao_id: String(row.licitacao_id || ''),
      valor_proposta: row.valor_proposta == null ? null : Number(row.valor_proposta),
      custos: (row.custos as Proposta['custos']) || null,
      margem_lucro: row.margem_lucro == null ? null : Number(row.margem_lucro),
      observacoes: row.observacoes ? String(row.observacoes) : null,
      arquivo_proposta: row.arquivo_proposta ? String(row.arquivo_proposta) : null,
      created_at: createdAt,
    } as TableRowMap[T]
  }

  return {
    id,
    licitacao_id: row.licitacao_id ? String(row.licitacao_id) : null,
    prompt: row.prompt ? String(row.prompt) : null,
    resposta: row.resposta ? String(row.resposta) : null,
    tipo: (row.tipo as AnaliseIARecord['tipo']) || 'edital',
    created_at: createdAt,
  } as TableRowMap[T]
}

class LocalQueryBuilder<T extends TableName> implements PromiseLike<{ data: TableRowMap[T] | TableRowMap[T][] | null; error: null }> {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null
  private filters: Array<(row: TableRowMap[T]) => boolean> = []
  private orderField: string | null = null
  private ascending = true
  private singleRow = false

  constructor(private readonly table: T) {}

  select() {
    return this
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Record<string, unknown>) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field as keyof TableRowMap[T]] === value)
    return this
  }

  in(field: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[field as keyof TableRowMap[T]]))
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field
    this.ascending = options?.ascending ?? true
    return this
  }

  single(): QueryResult<TableRowMap[T] | null> {
    this.singleRow = true
    return this.execute() as QueryResult<TableRowMap[T] | null>
  }

  then<TResult1 = { data: TableRowMap[T] | TableRowMap[T][] | null; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: TableRowMap[T] | TableRowMap[T][] | null; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute() {
    let rows = getTableRows(this.table)

    if (this.operation === 'insert') {
      const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload || {}]
      const inserted = payloadRows.map((row) => applyDefaults(this.table, row))
      rows = [...inserted, ...rows]
      setTableRows(this.table, rows)
      return { data: this.singleRow ? inserted[0] || null : inserted, error: null as null }
    }

    const filtered = rows.filter((row) => this.filters.every((filter) => filter(row)))

    if (this.operation === 'update') {
      const nextRows = rows.map((row) => {
        if (!filtered.some((item) => item.id === row.id)) return row
        const updated = {
          ...row,
          ...(this.payload || {}),
        } as TableRowMap[T]

        if (this.table === 'licitacoes') {
          ;(updated as Licitacao).updated_at = nowIso()
        }

        return updated
      })
      setTableRows(this.table, nextRows)
      const updatedRows = nextRows.filter((row) => this.filters.every((filter) => filter(row)))
      return { data: this.singleRow ? updatedRows[0] || null : updatedRows, error: null as null }
    }

    if (this.operation === 'delete') {
      const remaining = rows.filter((row) => !filtered.some((item) => item.id === row.id))
      setTableRows(this.table, remaining)
      return { data: this.singleRow ? filtered[0] || null : filtered, error: null as null }
    }

    let result = [...filtered]
    if (this.orderField) {
      const field = this.orderField as keyof TableRowMap[T]
      result.sort((a, b) => {
        const aValue = a[field]
        const bValue = b[field]
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return this.ascending ? 1 : -1
        if (bValue == null) return this.ascending ? -1 : 1
        if (aValue < bValue) return this.ascending ? -1 : 1
        if (aValue > bValue) return this.ascending ? 1 : -1
        return 0
      })
    }

    return {
      data: this.singleRow ? result[0] || null : deepClone(result),
      error: null as null,
    }
  }
}

export type LocalSupabaseClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: SessionUser } | null }; error: null }>
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ data: { user: SessionUser | null; session: { user: SessionUser } | null }; error: { message: string } | null }>
    signUp: (credentials: { email: string; password: string }) => Promise<{ data: { user: SessionUser | null; session: { user: SessionUser } | null }; error: { message: string } | null }>
    signOut: () => Promise<{ error: null }>
  }
  from: <T extends TableName>(table: T) => LocalQueryBuilder<T>
}

export function createLocalSupabaseClient(): LocalSupabaseClient {
  seedLocalData()

  return {
    auth: {
      async getSession() {
        const user = getSessionUser()
        return { data: { session: user ? { user } : null }, error: null }
      },
      async signInWithPassword({ email, password }) {
        const users = getUsers()
        const user = users.find((item) => item.email === email && item.password === password)
        if (!user) {
          return { data: { user: null, session: null }, error: { message: 'Credenciais inválidas' } }
        }
        const sessionUser = { id: user.id, email: user.email }
        setSessionUser(sessionUser)
        return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
      },
      async signUp({ email, password }) {
        const users = getUsers()
        if (users.some((item) => item.email === email)) {
          return { data: { user: null, session: null }, error: { message: 'Email já cadastrado' } }
        }
        const newUser = { id: createId(), email, password }
        setUsers([...users, newUser])
        const sessionUser = { id: newUser.id, email: newUser.email }
        setSessionUser(sessionUser)
        return { data: { user: sessionUser, session: { user: sessionUser } }, error: null }
      },
      async signOut() {
        setSessionUser(null)
        return { error: null }
      },
    },
    from(table) {
      return new LocalQueryBuilder(table)
    },
  }
}

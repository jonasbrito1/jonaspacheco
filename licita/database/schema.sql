-- =============================================
-- licita.jonaspacheco.cloud — Schema SQL
-- Executar no Supabase SQL Editor
-- =============================================

-- Licitações
CREATE TABLE IF NOT EXISTS licitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_edital TEXT NOT NULL,
  orgao TEXT NOT NULL,
  objeto TEXT NOT NULL,
  modalidade TEXT NOT NULL CHECK (modalidade IN (
    'pregao_eletronico','pregao_presencial','dispensa',
    'inexigibilidade','convite','tomada_de_precos','concorrencia'
  )),
  valor_estimado DECIMAL(15,2),
  data_abertura TIMESTAMPTZ,
  data_limite_proposta TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'analise' CHECK (status IN (
    'analise','documentacao','proposta_enviada','resultado','ganhou','perdeu','cancelada'
  )),
  score_viabilidade INTEGER CHECK (score_viabilidade BETWEEN 0 AND 100),
  arquivo_edital TEXT,
  analise_ia JSONB,
  exclusivo_me_epp BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('juridica','fiscal','tecnica','financeira','declaracao')),
  nome TEXT NOT NULL,
  arquivo_url TEXT,
  data_validade DATE,
  status TEXT DEFAULT 'valido' CHECK (status IN ('valido','vencendo','vencido','pendente')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Propostas
CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id UUID REFERENCES licitacoes(id) ON DELETE CASCADE,
  valor_proposta DECIMAL(15,2),
  custos JSONB,
  margem_lucro DECIMAL(5,2),
  observacoes TEXT,
  arquivo_proposta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Análises IA
CREATE TABLE IF NOT EXISTS analises_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitacao_id UUID REFERENCES licitacoes(id) ON DELETE SET NULL,
  prompt TEXT,
  resposta TEXT,
  tipo TEXT DEFAULT 'edital' CHECK (tipo IN ('edital','documentacao','lance','chat')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER licitacoes_updated_at
  BEFORE UPDATE ON licitacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (Row Level Security)
ALTER TABLE licitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_ia ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso total para usuários autenticados
CREATE POLICY "authenticated_all" ON licitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON analises_ia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_licitacoes_status ON licitacoes(status);
CREATE INDEX IF NOT EXISTS idx_licitacoes_data_abertura ON licitacoes(data_abertura);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON documentos(status);
CREATE INDEX IF NOT EXISTS idx_documentos_data_validade ON documentos(data_validade);
CREATE INDEX IF NOT EXISTS idx_propostas_licitacao ON propostas(licitacao_id);
CREATE INDEX IF NOT EXISTS idx_analises_licitacao ON analises_ia(licitacao_id);

-- Storage bucket para editais e documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('licita-docs', 'licita-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy
CREATE POLICY "authenticated_storage" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'licita-docs');

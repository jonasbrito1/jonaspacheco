const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function askClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return 'IA não configurada. Adicione ANTHROPIC_API_KEY ao arquivo .env para ativar a análise inteligente.'
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt || 'Você é um especialista em licitações públicas brasileiras.',
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    return data.content[0]?.text || 'Sem resposta da IA.'
  } catch (error) {
    console.error('Claude API error:', error)
    return 'Erro ao conectar com a IA. Tente novamente.'
  }
}

export const EDITAL_ANALYSIS_PROMPT = `
Você é um especialista em licitações públicas brasileiras com vasta experiência em pregões, concorrências e dispensas.

Analise o edital abaixo e extraia as seguintes informações em formato JSON:

{
  "orgao": "Nome do órgão licitante",
  "numero_edital": "Número do edital",
  "objeto": "Descrição do objeto da licitação",
  "modalidade": "pregao_eletronico|pregao_presencial|dispensa|inexigibilidade|convite|tomada_de_precos|concorrencia",
  "valor_estimado": 0.00,
  "data_abertura": "YYYY-MM-DD",
  "data_limite_proposta": "YYYY-MM-DD",
  "exclusivo_me_epp": true|false,
  "documentos_exigidos": ["lista", "de", "documentos"],
  "criterios_tecnicos": ["criterios"],
  "riscos": ["riscos identificados"],
  "score_viabilidade": 75,
  "justificativa_score": "Explicação do score de 0-100",
  "recomendacoes": ["recomendações para participar"]
}

Responda APENAS com o JSON válido, sem markdown ou texto adicional.
`

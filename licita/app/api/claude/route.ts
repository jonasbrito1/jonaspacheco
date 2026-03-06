import { NextRequest, NextResponse } from 'next/server'
import { askClaude, type ClaudeMessage } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()
    if (!message) return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })

    const messages: ClaudeMessage[] = [
      ...history.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: message },
    ]

    const systemPrompt = `Você é um assistente especialista em licitações públicas brasileiras, com profundo conhecimento em:
- Legislação: Lei 14.133/2021 (Nova Lei de Licitações), Lei 8.666/93, Lei 10.520/02
- Modalidades: pregão eletrônico/presencial, dispensa, inexigibilidade, concorrência
- Documentação: certidões, atestados de capacidade técnica, declarações
- Estratégias de precificação e cálculo de lances
- Habilitação jurídica, fiscal, técnica e econômico-financeira
- Recursos, impugnações e pedidos de esclarecimento

Responda de forma objetiva, clara e prática. Use exemplos quando necessário.`

    const response = await askClaude(messages, systemPrompt)
    return NextResponse.json({ content: response })
  } catch (error) {
    console.error('claude route error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

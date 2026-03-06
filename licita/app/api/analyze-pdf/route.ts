import { NextRequest, NextResponse } from 'next/server'
import { askClaude, EDITAL_ANALYSIS_PROMPT } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const orgao = formData.get('orgao') as string | null
    const numeroEdital = formData.get('numero_edital') as string | null

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Arquivo deve ser PDF' }, { status: 400 })

    // Extract text from PDF
    let pdfText = ''
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      // Dynamic import to handle server-side only
      const pdfParse = (await import('pdf-parse')).default
      const parsed = await pdfParse(buffer)
      pdfText = parsed.text
    } catch {
      // If pdf-parse fails, use filename as context
      pdfText = `Arquivo: ${file.name}. Órgão: ${orgao || 'não informado'}. Edital: ${numeroEdital || 'não informado'}.`
    }

    // Truncate to avoid token limits
    const truncated = pdfText.slice(0, 8000)
    const prompt = `${EDITAL_ANALYSIS_PROMPT}\n\nTexto do Edital:\n${truncated}`

    const response = await askClaude(
      [{ role: 'user', content: prompt }],
      'Você é um especialista em licitações públicas brasileiras. Responda APENAS com JSON válido.'
    )

    // Check for placeholder (API key not set)
    if (response.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json({
        orgao: orgao || '',
        numero_edital: numeroEdital || '',
        objeto: 'Configure ANTHROPIC_API_KEY para extração automática',
        modalidade: 'pregao_eletronico',
        score_viabilidade: null,
        documentos_exigidos: ['Configure a IA para extrair documentos'],
        riscos: ['IA não configurada'],
        recomendacoes: ['Adicione ANTHROPIC_API_KEY ao .env'],
        _placeholder: true,
      })
    }

    // Parse JSON response
    try {
      // Extract JSON from response (Claude sometimes adds text around it)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response
      const parsed = JSON.parse(jsonStr)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'Erro ao processar resposta da IA', raw: response.slice(0, 500) }, { status: 500 })
    }
  } catch (error) {
    console.error('analyze-pdf error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

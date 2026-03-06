'use client'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bot, User, Send, Loader2, Lightbulb } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'Quais documentos são necessários para participar de um pregão eletrônico?',
  'Como calcular o BDI para uma proposta de serviços de TI?',
  'O que é habilitação técnica e quais atestados são aceitos?',
  'Quando posso usar dispensa de licitação?',
]

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente especialista em licitações públicas brasileiras. Posso te ajudar com análise de editais, documentação, estratégias de preço e dúvidas sobre a legislação. Como posso ajudar?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (message: string) => {
    if (!message.trim() || loading) return
    setInput('')
    const userMsg: Message = { role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Erro ao obter resposta.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-bg1 border border-[#1a3a5c] rounded-2xl overflow-hidden max-h-[calc(100vh-180px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-primary/20' : 'bg-blue/20'
            }`}>
              {msg.role === 'assistant' ? <Bot size={16} className="text-primary" /> : <User size={16} className="text-blue" />}
            </div>
            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue/20 text-text1 rounded-tr-sm'
                : 'bg-bg2 text-text1 rounded-tl-sm border border-[#1a3a5c]'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot size={16} className="text-primary" />
            </div>
            <div className="bg-bg2 border border-[#1a3a5c] rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={14} className="animate-spin text-text3" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length === 1 && (
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 text-text3 text-xs mb-2"><Lightbulb size={12} /> Sugestões</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button key={i} onClick={() => sendMessage(prompt)}
                className="text-xs bg-bg2 border border-[#1a3a5c] text-text2 px-3 py-1.5 rounded-lg hover:border-primary/50 hover:text-text1 transition-colors text-left">
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#1a3a5c] p-4 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
          placeholder="Pergunte sobre licitações..."
          className="flex-1 h-10 px-4 rounded-xl bg-bgInput border border-[#1a3a5c] text-text1 text-sm placeholder:text-text3 outline-none focus:border-primary transition-colors"
        />
        <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} size="icon">
          <Send size={15} />
        </Button>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import api from '../services/api'

const Card = ({ label, value, color = '#FFDF00', sub }) => (
  <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: '20px 24px', borderTop: `3px solid ${color}` }}>
    <p style={{ color: '#8BAFC8', fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
    <p style={{ color, fontSize: 26, fontWeight: 700 }}>{value}</p>
    {sub && <p style={{ color: '#4A6B87', fontSize: 12, marginTop: 4 }}>{sub}</p>}
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [monthly, setMonthly] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data))
    api.get('/finance/monthly').then(r => setMonthly(r.data))
  }, [])

  if (!data) return <p style={{ color: '#8BAFC8' }}>Carregando...</p>

  const { projects, finance, recent_transactions } = data
  const lucro = (parseFloat(finance.receita_mes) - parseFloat(finance.despesa_mes)).toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#EEF2FF' }}>Dashboard</h2>
        <p style={{ color: '#4A6B87', fontSize: 13, marginTop: 2 }}>Visão geral do negócio</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        <Card label="Projetos Ativos"  value={projects.ativos}    color="#FFDF00" />
        <Card label="Em Manutenção"    value={projects.manutencao} color="#F97316" />
        <Card label="Concluídos"       value={projects.concluidos} color="#009C3B" />
        <Card label="Receita do Mês"   value={`R$ ${parseFloat(finance.receita_mes).toFixed(2)}`}  color="#009C3B" />
        <Card label="Despesas do Mês"  value={`R$ ${parseFloat(finance.despesa_mes).toFixed(2)}`}  color="#EF4444" />
        <Card label="Lucro do Mês"     value={`R$ ${lucro}`} color={lucro >= 0 ? '#009C3B' : '#EF4444'} />
        <Card label="A Receber"        value={`R$ ${parseFloat(finance.a_receber).toFixed(2)}`}    color="#F97316" sub="pagamentos pendentes" />
      </div>

      <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20, color: '#EEF2FF' }}>Receitas vs Despesas (6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" tick={{ fill: '#4A6B87', fontSize: 12 }} />
              <YAxis tick={{ fill: '#4A6B87', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#112640', border: '1px solid #1a3a5c', borderRadius: 8, color: '#EEF2FF' }} />
              <Legend />
              <Bar dataKey="receita" fill="#009C3B" radius={[4,4,0,0]} name="Receita" />
              <Bar dataKey="despesa" fill="#EF4444" radius={[4,4,0,0]} name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#0d1e35', border: '1px solid #1a3a5c', borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: '#EEF2FF' }}>Transações Recentes</h3>
          {recent_transactions.length === 0 ? <p style={{ color: '#4A6B87' }}>Nenhuma transação</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent_transactions.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1a3a5c' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#EEF2FF' }}>{t.description}</p>
                    <p style={{ fontSize: 11, color: '#4A6B87', marginTop: 2 }}>{t.project_name || 'Sem projeto'} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span style={{ color: t.type === 'receita' ? '#009C3B' : '#EF4444', fontWeight: 700, fontSize: 14 }}>
                    {t.type === 'receita' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
